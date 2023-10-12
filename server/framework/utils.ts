import * as AWS from 'aws-sdk';
import { PutObjectRequest } from 'aws-sdk/clients/s3';

export function getParamNames(f: Function) {
  return f
    .toString()
    .match(/\((.*?)\)/)![1]
    .split(",") // Simple regex to get "name: type" items in signature
    .map((param: string) => param.split("=")[0].trim()); // remove whitespaces
}

function configureAWS() { 
  AWS.config.update({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_ACCESS_KEY_SECRET,
    region: 'us-east-1',
  })
}

export async function storeInS3(file: Uint8Array, mimeType: string): Promise<string> {
  configureAWS();
  const s3Client = new AWS.S3();

  const params: PutObjectRequest = {
    Bucket: process.env.AWS_S3_BUCKET_NAME as string,
    Key: new Date().getTime().toString(),
    Body: Buffer.from(file),
    ContentType: mimeType,
    ACL: 'public-read',
  }

  const result = await s3Client.upload(params).promise();
  return result.Location;
}