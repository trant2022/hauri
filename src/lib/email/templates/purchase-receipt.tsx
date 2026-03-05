import React from "react"

interface PurchaseReceiptEmailProps {
  linkTitle: string
  amountFormatted: string
  downloadUrl: string
}

export function PurchaseReceiptEmail({
  linkTitle,
  amountFormatted,
  downloadUrl,
}: PurchaseReceiptEmailProps) {
  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: "#1a1a1a",
        backgroundColor: "#ffffff",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: "#6d28d9",
          marginBottom: "32px",
        }}
      >
        Unlockt
      </div>

      <h1
        style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "#1a1a1a",
          margin: "0 0 24px 0",
        }}
      >
        Your purchase receipt
      </h1>

      <p style={{ fontSize: "16px", lineHeight: "1.6", margin: "0 0 16px 0" }}>
        Thank you for your purchase!
      </p>

      <div
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <p
          style={{ fontSize: "16px", lineHeight: "1.6", margin: "0 0 8px 0" }}
        >
          <strong>Item:</strong> {linkTitle}
        </p>
        <p style={{ fontSize: "16px", lineHeight: "1.6", margin: "0" }}>
          <strong>Amount paid:</strong> {amountFormatted}
        </p>
      </div>

      <div style={{ textAlign: "center" as const, margin: "32px 0" }}>
        <a
          href={downloadUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#6d28d9",
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: 600,
            textDecoration: "none",
            padding: "14px 32px",
            borderRadius: "8px",
          }}
        >
          Download your file
        </a>
        <p
          style={{
            fontSize: "13px",
            color: "#6b7280",
            marginTop: "12px",
          }}
        >
          This link expires in 48 hours.
        </p>
      </div>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #e5e7eb",
          margin: "32px 0",
        }}
      />

      <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 8px 0" }}>
        If you have any issues, reply to this email.
      </p>
      <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0" }}>
        Powered by Unlockt
      </p>
    </div>
  )
}
