"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function DonationSuccessPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            Your donation has been received. You should receive a confirmation email shortly.
          </p>
          <Link
            href={`/donate/${slug}`}
            className="text-indigo-600 hover:underline text-sm"
          >
            Make another donation
          </Link>
        </div>
      </div>
    </div>
  );
}
