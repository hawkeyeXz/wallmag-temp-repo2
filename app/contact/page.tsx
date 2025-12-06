"use client";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import React, { useState } from "react";

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: "",
    });

    // const whatsappNumber = "1234567890"; // Replace with your WhatsApp number (with country code, no + or spaces)
    // const telegramUsername = "yourusername"; // Replace with your Telegram username

    const handleWhatsApp = () => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const message = encodeURIComponent("Hi! I would like to get in touch.");

        if (isMobile) {
            window.open(`whatsapp://send?phone=${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}&text=${message}`, "_blank");
        } else {
            window.open(
                `https://web.whatsapp.com/send?phone=${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}&text=${message}`,
                "_blank"
            );
        }
    };

    const handleTelegram = () => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const message = encodeURIComponent("Hi! I would like to get in touch.");

        if (isMobile) {
            window.open(`tg://resolve?domain=${process.env.NEXT_PUBLIC_TELEGRAM_USERNAME}&text=${message}`, "_blank");
        } else {
            window.open(`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_USERNAME}`, "_blank");
        }
    };

    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        console.log("Form submitted:", formData);
        alert("Message sent! (This is a demo)");
        setFormData({ name: "", email: "", message: "" });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl">
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-5xl font-bold text-gray-800 mb-4 tracking-tight">
                        Get In{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            Touch
                        </span>
                    </h1>
                    <p className="text-gray-600 text-lg">
                        We'd love to hear from you. Choose your preferred way to connect.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Contact Form */}
                    <div className="bg-white rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-300">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Mail className="text-indigo-600" />
                            Send us a message
                        </h2>
                        <div className="space-y-5">
                            <div className="group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none resize-none"
                                    placeholder="Tell us how we can help..."
                                ></textarea>
                            </div>
                            <button
                                onClick={handleSubmit}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <Send size={20} />
                                Send Message
                            </button>
                        </div>
                    </div>

                    {/* Quick Contact Options */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-300">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <MessageCircle className="text-indigo-600" />
                                Quick Connect
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Choose your favorite messaging platform and start chatting instantly!
                            </p>

                            <div className="space-y-4">
                                {/* WhatsApp */}
                                <button
                                    onClick={handleWhatsApp}
                                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-5 rounded-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 group"
                                >
                                    <svg
                                        className="w-7 h-7 group-hover:scale-110 transition-transform"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    Chat on WhatsApp
                                </button>

                                {/* Telegram */}
                                <button
                                    onClick={handleTelegram}
                                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-5 rounded-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 group"
                                >
                                    <svg
                                        className="w-7 h-7 group-hover:scale-110 transition-transform"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                    </svg>
                                    Chat on Telegram
                                </button>

                                {/* Phone */}
                                <a
                                    href="tel:+1234567890"
                                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold py-5 rounded-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 group"
                                >
                                    <Phone className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                    Call Us Directly
                                </a>
                            </div>
                        </div>

                        {/* Info Card */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-8 text-white transform hover:scale-105 transition-all duration-300">
                            <h3 className="text-xl font-bold mb-4">Available 24/7</h3>
                            <p className="text-indigo-100 leading-relaxed">
                                Our team is always ready to help. Whether you prefer email, messaging apps, or a direct
                                call, we're here for you.
                            </p>
                            <div className="mt-6 space-y-2 text-sm text-indigo-100">
                                <p>📧 support@example.com</p>
                                <p>📍 123 Business St, City, Country</p>
                                <p>⏰ Response time: ~2 hours</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.6s ease-out;
                }
            `}</style>
        </div>
    );
}
