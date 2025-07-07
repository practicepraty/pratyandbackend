import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

// Create Bedrock client for Indian region
const createBedrockClient = () => {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "ap-south-1", // Mumbai region
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

export { createBedrockClient };