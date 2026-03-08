import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const formatCurrency = (value) => `Rs ${Number(value).toFixed(2)}`;

const formatDate = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const bufferFromPdf = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });

const drawHeader = (doc, order) => {
  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("Amma Fruit Shop", { align: "left" });
  doc
    .fontSize(10)
    .font("Helvetica")
    .text("Fresh Fruits Invoice", { align: "left" });
  doc.moveDown(1);

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(`Invoice ID: ${order.orderCode}`)
    .font("Helvetica")
    .text(`Placed At: ${formatDate(order.createdAt)}`)
    .text(`Customer: ${order.customerName}`)
    .text(`WhatsApp: ${order.whatsappNumber}`)
    .text(`Payment Type: ${order.paymentType}`)
    .text(`Payment Status: ${order.payment?.status ?? "pending"}`);
};

const drawItemsTable = (doc, order) => {
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(11).text("Items");
  doc.moveDown(0.4);

  order.items.forEach((item) => {
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        `${item.fruitName} | ${item.quantityKg}kg x ${formatCurrency(item.pricePerKg)} = ${formatCurrency(item.lineTotal)}`,
      );
  });

  doc.moveDown(1);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(`Grand Total: ${formatCurrency(order.totalAmount)}`, { align: "right" });
};

const drawFooter = (doc) => {
  doc.moveDown(2);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#4B5563")
    .text("Thank you for purchasing in Amma Fruit Shop 🍎", {
      align: "center",
    });
  doc.fillColor("black");
};

export const buildInvoicePreview = (order) => ({
  orderId: order._id.toString(),
  orderCode: order.orderCode,
  createdAt: order.createdAt,
  customerName: order.customerName,
  whatsappNumber: order.whatsappNumber,
  paymentType: order.paymentType,
  paymentStatus: order.payment?.status ?? "pending",
  totalAmount: order.totalAmount,
  items: order.items,
});

export const generateInvoicePdfBuffer = async (order) => {
  const doc = new PDFDocument({ size: "A4", margin: 48 });

  drawHeader(doc, order);
  drawItemsTable(doc, order);

  if (order.paymentType === "online" && order.payment?.upiIntent) {
    const qrDataUrl = await QRCode.toDataURL(order.payment.upiIntent, {
      width: 140,
      margin: 1,
    });
    const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

    doc.moveDown(1.5);
    doc.font("Helvetica-Bold").fontSize(11).text("UPI Payment QR");
    doc.image(qrBuffer, {
      fit: [120, 120],
      align: "left",
    });
  }

  drawFooter(doc);
  return bufferFromPdf(doc);
};
