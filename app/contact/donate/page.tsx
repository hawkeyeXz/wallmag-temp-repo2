"use client";
import { Check, CreditCard, DollarSign, Smartphone, X } from "lucide-react";
import React, { useState } from "react";

export default function PaymentPage() {
    const [amount, setAmount] = useState("");
    const [selectedMethod, setSelectedMethod] = useState("");
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState("");

    // Payment configurations from environment variables
    const upiId = process.env.NEXT_PUBLIC_UPI_ID || "yourname@paytm";
    const paypalEmail = process.env.NEXT_PUBLIC_PAYPAL_EMAIL || "your@email.com";
    const paypalMeUsername = process.env.NEXT_PUBLIC_PAYPAL_ME || ""; // Optional: PayPal.Me username
    const merchantName = process.env.NEXT_PUBLIC_MERCHANT_NAME || "Your Business";

    const handleUPIPayment = () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR`;

        if (isMobile) {
            // Open UPI app picker on mobile - works with all UPI apps
            window.open(upiUrl, "_blank");
            setSelectedMethod("upi");
        } else {
            // Desktop: Generate and show QR code
            generateQRCode(upiUrl);
            setShowQRModal(true);
            setSelectedMethod("upi");
        }
    };

    const generateQRCode = (upiString: string) => {
        // Using Google Charts API to generate QR code
        const qrSize = 300;
        const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${qrSize}x${qrSize}&chl=${encodeURIComponent(
            upiString
        )}`;
        setQrCodeUrl(qrUrl);
    };

    const handlePayPal = () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        // If PayPal.Me username is provided, use that (simpler)
        if (paypalMeUsername) {
            window.open(`https://paypal.me/${paypalMeUsername}/${amount}`, "_blank");
        } else {
            // Standard PayPal payment link
            const paypalUrl = `https://www.paypal.com/paypalme/${paypalEmail}/${amount}`;
            window.open(paypalUrl, "_blank");
        }
        setSelectedMethod("paypal");
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
            setAmount(value);
        }
    };

    const quickAmounts = [100, 500, 1000, 2000, 5000];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <div className="text-center mb-12 animate-fade-in">
                    <div className="inline-block p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
                        <CreditCard className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-5xl font-bold text-gray-800 mb-4 tracking-tight">
                        Quick{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                            Payment
                        </span>
                    </h1>
                    <p className="text-gray-600 text-lg">Choose your preferred payment method</p>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6 transform hover:scale-105 transition-all duration-300">
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Enter Amount</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-2xl font-bold">
                                ₹
                            </span>
                            <input
                                type="text"
                                value={amount}
                                onChange={handleAmountChange}
                                className="w-full pl-12 pr-4 py-4 text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                            {quickAmounts.map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => setAmount(amt.toString())}
                                    className="px-4 py-2 bg-gray-100 hover:bg-blue-500 hover:text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedMethod && (
                        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center gap-3">
                            <Check className="text-green-600 w-6 h-6" />
                            <span className="text-green-800 font-medium">Payment method selected</span>
                        </div>
                    )}

                    {/* UPI Payment Section */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Smartphone className="text-blue-600" />
                            UPI Payment
                        </h2>
                        <button
                            onClick={handleUPIPayment}
                            className="w-full group p-8 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-2xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-4"
                        >
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Smartphone className="w-10 h-10 text-white" />
                            </div>
                            <div className="text-left">
                                <span className="block text-white font-bold text-2xl">Pay with UPI</span>
                                <span className="block text-orange-100 text-sm">GPay, PhonePe, Paytm, BHIM & more</span>
                            </div>
                        </button>
                        <p className="text-center text-gray-500 text-sm mt-3">
                            {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                                ? "📱 Choose your preferred UPI app on next screen"
                                : "💻 Scan QR code with any UPI app"}
                        </p>
                    </div>

                    {/* PayPal Section */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <DollarSign className="text-blue-600" />
                            International Payment
                        </h2>
                        <button
                            onClick={handlePayPal}
                            className="w-full group p-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-4"
                        >
                            <svg
                                className="w-12 h-12 text-white group-hover:scale-110 transition-transform"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M8.32 21.97a.546.546 0 01-.26-.32c-.03-.15-.01-.3.03-.44l2.36-8.4c.04-.15.13-.28.25-.37.12-.09.27-.13.42-.13h4.78c1.22 0 2.25-.33 3.07-.99.82-.66 1.38-1.59 1.67-2.77.29-1.18.21-2.21-.24-3.08s-1.23-1.52-2.35-1.94c-.56-.21-1.18-.32-1.87-.32h-7c-.41 0-.77.24-.93.61L4.54 15.46c-.16.37.05.8.47.96.42.16.89-.05 1.05-.42l2.07-4.71h2.21l-1.76 6.26h2.03l1.76-6.26h2.21l-1.76 6.26h2.03l1.76-6.26h2.21l-1.94 6.91c-.08.28-.31.48-.61.48H8.32z" />
                            </svg>
                            <div className="text-left">
                                <span className="block text-white font-bold text-xl">Pay with PayPal</span>
                                <span className="block text-blue-200 text-sm">Secure international payments</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* QR Code Modal */}
                {showQRModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full transform scale-100 animate-scale-in">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">Scan QR Code</h3>
                                <button
                                    onClick={() => setShowQRModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-600" />
                                </button>
                            </div>

                            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-2xl mb-6">
                                <div className="bg-white p-4 rounded-xl inline-block shadow-lg">
                                    <img src={qrCodeUrl} alt="UPI QR Code" className="w-64 h-64" />
                                </div>
                            </div>

                            <div className="space-y-3 text-center">
                                <div className="bg-blue-50 p-4 rounded-xl">
                                    <p className="text-sm text-gray-600 mb-1">UPI ID</p>
                                    <p className="font-mono font-bold text-gray-800">{upiId}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-xl">
                                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                                    <p className="text-2xl font-bold text-green-600">₹{amount}</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-xl">
                                    <p className="text-sm text-gray-600 mb-1">Merchant</p>
                                    <p className="font-semibold text-gray-800">{merchantName}</p>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                <p className="text-sm text-orange-800 text-center">
                                    📱 Open any UPI app and scan this QR code to complete payment
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Card */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-2xl p-6 text-white">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/20 rounded-full">
                            <Check className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-2">Secure & Instant</h3>
                            <p className="text-blue-100 text-sm leading-relaxed">
                                All payments are processed securely through trusted payment gateways. Your transaction
                                will be completed instantly.
                            </p>
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
                @keyframes scale-in {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.6s ease-out;
                }
                .animate-scale-in {
                    animation: scale-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
