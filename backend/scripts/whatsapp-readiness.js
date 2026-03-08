import { env } from "../src/config/env.js";
import { getWhatsAppReadiness } from "../src/services/whatsappReadiness.service.js";

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

  const result = await getWhatsAppReadiness({
    verifyPublicApiBaseUrl: true,
    verifyToken: true,
    forceRefresh: true,
  });

  if (!result.ready) {
    console.log("STATUS: NOT READY");
    result.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log("STATUS: READY");
  process.exitCode = 0;
};

await run();
