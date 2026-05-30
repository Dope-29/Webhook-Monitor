'use strict';

const db = require('../config/database');

/**
 * GET /api/dashboard/stats
 *
 * Returns all dashboard metrics in a SINGLE database round-trip using CTEs.
 * Replaces the previous pattern of multiple sequential queries.
 *
 * Returns:
 *  - total_events_today
 *  - failed_today
 *  - success_rate_7d  (percentage)
 *  - avg_latency_7d   (ms)
 *  - pipeline_health  (per-pipeline: event_count_24h, failure_count_24h, last_status_code)
 *  - daily_counts     (last 7 days: date + count for sparkline)
 */
async function getStats(req, res, next) {
  try {
    const customerId = req.user.customer_id;

    const { rows } = await db.query(
      `WITH
        today AS (
          SELECT
            COUNT(*)                                                         AS total_today,
            COUNT(*) FILTER (WHERE status_code < 0 OR status_code >= 400)   AS failed_today
          FROM webhooks
          WHERE customer_id = $1
            AND created_at >= CURRENT_DATE
        ),
        week AS (
          SELECT
            COUNT(*)                                                             AS total_7d,
            COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)    AS success_7d,
            ROUND(AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL))        AS avg_latency_7d
          FROM webhooks
          WHERE customer_id = $1
            AND created_at >= NOW() - INTERVAL '7 days'
        ),
        pipeline_stats AS (
          SELECT
            p.id,
            p.name,
            p.paused,
            COUNT(w.id) FILTER (WHERE w.created_at >= NOW() - INTERVAL '24 hours')                          AS event_count_24h,
            COUNT(w.id) FILTER (WHERE w.created_at >= NOW() - INTERVAL '24 hours'
                                  AND (w.status_code < 0 OR w.status_code >= 400))                          AS failure_count_24h,
            (SELECT w2.status_code FROM webhooks w2
             WHERE w2.pipeline_id = p.id ORDER BY w2.created_at DESC LIMIT 1)                               AS last_status_code
          FROM pipelines p
          LEFT JOIN webhooks w ON w.pipeline_id = p.id
          WHERE p.customer_id = $1
          GROUP BY p.id, p.name, p.paused
          ORDER BY p.created_at DESC
        ),
        daily AS (
          SELECT
            DATE(created_at AT TIME ZONE 'UTC') AS day,
            COUNT(*)                             AS count
          FROM webhooks
          WHERE customer_id = $1
            AND created_at >= NOW() - INTERVAL '7 days'
          GROUP BY day
          ORDER BY day ASC
        )
      SELECT
        (SELECT row_to_json(today) FROM today)                       AS today,
        (SELECT row_to_json(week)  FROM week)                        AS week,
        (SELECT json_agg(pipeline_stats) FROM pipeline_stats)        AS pipeline_health,
        (SELECT json_agg(daily) FROM daily)                          AS daily_counts`,
      [customerId]
    );

    const row = rows[0];
    const today = row.today || {};
    const week  = row.week  || {};

    const totalWeek   = parseInt(week.total_7d   || 0, 10);
    const successWeek = parseInt(week.success_7d || 0, 10);
    const successRate = totalWeek > 0 ? Math.round((successWeek / totalWeek) * 100) : 100;

    res.json({
      total_events_today: parseInt(today.total_today  || 0, 10),
      failed_today:       parseInt(today.failed_today || 0, 10),
      success_rate_7d:    successRate,
      avg_latency_7d:     parseInt(week.avg_latency_7d || 0, 10),
      pipeline_health:    row.pipeline_health || [],
      daily_counts:       row.daily_counts   || [],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats };
