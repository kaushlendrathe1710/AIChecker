import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || "").trim();
const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || "").trim();
const region = (process.env.AWS_REGION || "us-east-1").trim();
const bucketName = (process.env.AWS_BUCKET_NAME || "").trim();

console.log("AWS S3 Config:", {
  region,
  bucket: bucketName,
  accessKeyIdLength: accessKeyId.length,
  accessKeyIdFirst4: accessKeyId.substring(0, 4),
  accessKeyIdLast4: accessKeyId.substring(accessKeyId.length - 4),
  secretKeyLength: secretAccessKey.length,
  hasSpecialChars: /[^A-Za-z0-9+/=]/.test(secretAccessKey),
});

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ key: string; url: string }> {
  const key = `documents/${randomUUID()}-${fileName}`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  const url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  
  return { key, url };
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  }));

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  }));
}
