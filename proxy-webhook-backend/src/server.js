const app = require('./app');

const PORT = process.env.PORT || 3000;

//bootup check
if(!process.env.MASTER_KEY || process.env.MASTER_KEY.length !== 64) {
  console.log('fatal error: MASTER_KEY invalid or not available');
  console.log('key must be cryptographically secure string of 64 characters');
  process.exit(1);
}

const server = app.listen(PORT, () =>{
  console.log(`server executing securley in [${process.env.NODE_ENV}] mode on port ${PORT}`);
});

//handle unhandles promise 
process.on('unhandledRejection', (reason, promise) => {
  console.error('unhandles rejection error: ${err.message}');
  server.close(() => process.exit(1));
});