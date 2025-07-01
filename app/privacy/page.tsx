"use client";
import { useState } from "react";

export default function ContactForm() {
  const [formData, setFormData] = useState({ to: "", subject: "", text: "" });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Email sent successfully!");
      } else {
        alert("Failed to send email.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="to"
        value={formData.to}
        onChange={handleChange}
        placeholder="To"
      />
      <input
        name="subject"
        value={formData.subject}
        onChange={handleChange}
        placeholder="Subject"
      />
      <textarea
        name="text"
        value={formData.text}
        onChange={handleChange}
        placeholder="Message"
      />
      <button type="submit">Send</button>
    </form>
  );
}
