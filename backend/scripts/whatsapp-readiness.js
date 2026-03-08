import { env } from "../src/config/env.js";
import { getWhatsAppReadiness } from "../src/services/whatsappReadiness.service.js";

const result = getWhatsAppReadiness();

const verifyWhatsAppToken = async () => {
  const response = await fetch(
    `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}?fields=id`,
    {
      headers: {
        Authorization: `Bearer ${env.whatsappAccessToken}`,
      },
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        `Token verification failed with status ${response.status}.`,
    );
  }

  if (!data?.id) {
    throw new Error("Token check succeeded but WhatsApp phone number ID was not returned.");
  }
};

const verifyPublicApiBaseUrl = async () => {
  const healthUrl = `${env.publicApiBaseUrl.replace(/\/$/, "")}/health`;
  const response = await fetch(healthUrl);

  if (!response.ok) {
    throw new Error(
      `PUBLIC_API_BASE_URL health check failed (${response.status}) at ${healthUrl}.`,
    );
  }
};

const run = async () => {
  console.log("WhatsApp Readiness Check");
  console.log("------------------------");
  console.log(`PUBLIC_API_BASE_URL: ${env.publicApiBaseUrl}`);
  console.log(`WHATSAPP_ENABLED: ${env.whatsappEnabled}`);
  console.log(
    `WHATSAPP_PHONE_NUMBER_ID: ${env.whatsappPhoneNumberId ? "set" : "missing"}`,
  );
  console.log(
    `WHATSAPP_ACCESS_TOKEN: ${env.whatsappAccessToken ? "set" : "missing"}`,
  );

  if (!result.ready) {
    console.log("STATUS: NOT READY");
    result.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
    process.exit(1);
  }

  try {
    await verifyPublicApiBaseUrl();
    await verifyWhatsAppToken();
    console.log("STATUS: READY");
    process.exit(0);
  } catch (error) {
    const detailedMessage =
      error?.cause?.message || error?.message || "Unknown readiness error.";
    console.log("STATUS: NOT READY");
    console.log(`1. ${detailedMessage}`);
    process.exit(1);
  }
};

await run();
