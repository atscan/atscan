const Typesense = require("typesense");

let client = new Typesense.Client({
  "nodes": [{
    "host": "localhost", // For Typesense Cloud use xxx.a1.typesense.net
    "port": "8108", // For Typesense Cloud use 443
    "protocol": "http", // For Typesense Cloud use https
  }],
  "apiKey": "Kaey9ahMo7xoob1haivaithe2Aighoo3azohl2Joo5Aemoh4aishoogugh3Oowim",
  "connectionTimeoutSeconds": 2,
});

/*const schema = {
    name: 'dids',
    fields: [
        { name: 'did', type: 'string' },
        { name: 'handles', type: 'string[]' },
    ]
}

client.collections().create(schema)
  .then(function (data) {
    console.log(data)
  })*/
