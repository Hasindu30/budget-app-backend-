const fs = require('fs');
const dns = require('dns');
dns.setServers(['8.8.8.8']);

const hostname = '_mongodb._tcp.budgetwise.55uazmn.mongodb.net';
const txtHostname = 'budgetwise.55uazmn.mongodb.net';

dns.resolveSrv(hostname, (err, srvRecords) => {
  if (err) return console.error(err);
  dns.resolveTxt(txtHostname, (err, txtRecords) => {
    if (err) return console.error(err);
    fs.writeFileSync('dns_dump.json', JSON.stringify({ srvRecords, txtRecords }, null, 2));
    console.log('Done');
  });
});
