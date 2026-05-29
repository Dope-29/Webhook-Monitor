'use strict';

/**
 * Joi Validation Middleware Factory
 *
 * Usage: router.post('/path', validate(myJoiSchema), controller.handler)
 *
 * Returns 422 with field-level error details on failure.
 * Mutates req.body to the Joi-stripped/coerced value on success.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // collect all errors, not just the first
      stripUnknown: true,  // drop any fields not in the schema
    });

    if (error) {
      return res.status(422).json({
        error: 'Validation failed.',
        details: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message.replace(/['"]/g, ''), // strip Joi's quotes for cleaner output
        })),
      });
    }

    req.body = value; // use the sanitised/coerced value from here on
    next();
  };
}

module.exports = { validate };
