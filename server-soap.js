const soap = require('soap');
const http = require('http');
const fs = require('fs');

const service = {
  PaymentService: {
    PaymentPort: {
      processPayment: function(args) {
        console.log(`\nid transaksi: ${args.transactionId}, jumlah: Rp${args.amount}`);
        
        if (args.amount > 0) {
          return { status: 'SUCCESS' };
        } else {
          return { status: 'FAILED' };
        }
      }
    }
  }
};

const xml = fs.readFileSync('payment.wsdl', 'utf8');
const server = http.createServer((req, res) => res.end('SOAP Server OK'));

server.listen(8000, () => {
  const soapServer = soap.listen(server, '/payment', service, xml);

  soapServer.on('request', (requestRaw, methodName) => {
    console.log(`request:`);
    console.log(requestRaw); 
  });

  soapServer.on('response', (responseRaw, methodName) => {
    console.log(`\nresponse`);
    console.log(responseRaw);

});

  console.log('Server B (SOAP Bank) jalan di port 8000');
});