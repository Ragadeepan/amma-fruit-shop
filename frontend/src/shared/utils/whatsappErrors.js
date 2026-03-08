export const formatWhatsAppError = (message = "") => {
  const normalizedMessage = String(message || "").trim();
  const lowerMessage = normalizedMessage.toLowerCase();

  if (
    normalizedMessage.includes("(#131030)") ||
    lowerMessage.includes("recipient phone number not in allowed list")
  ) {
    return "This customer number is not added in Meta test recipients. Open Meta Developers -> WhatsApp -> API Setup, add the number in the 'To' list, verify OTP, then retry.";
  }

  if (lowerMessage.includes("session has expired")) {
    return "WhatsApp access token expired. Generate a new token in Meta and restart the backend.";
  }

  return normalizedMessage;
};
