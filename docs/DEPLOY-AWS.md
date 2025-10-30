# Pro API on AWS (outline)

Use Serverless Framework or AWS SAM.

## serverless.yml sketch

```yaml
service: envpatrol-api
provider:
  name: aws
  runtime: nodejs20.x
  region: ap-south-1
  httpApi:
    cors: true

functions:
  pdf:
    handler: handler.pdf
    events:
      - httpApi:
          path: /pdf
          method: post
  save:
    handler: handler.save
    events:
      - httpApi:
          path: /save
          method: post
```

## handler.js sketch

```js
exports.pdf = async (event) => {
  const { html } = JSON.parse(event.body || "{}");
  // TODO: render a PDF from HTML, put into S3, return a signed URL
  return { statusCode: 200, body: JSON.stringify({ ok: true, url: null }) };
};

exports.save = async (event) => {
  const payload = JSON.parse(event.body || "{}");
  // TODO: write to DynamoDB for Pro users
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
```

Point your UI buttons to the API Gateway endpoints.
