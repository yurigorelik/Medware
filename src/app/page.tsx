import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-primary-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              AI-Powered Medical{" "}
              <span className="text-primary-600">Second Opinions</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Connect with qualified physicians through our intelligent
              consultation platform. Get comprehensive case summaries,
              differential diagnoses, and suggested workups — all reviewed and
              approved by your chosen doctor.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/auth/signup" className="btn-primary text-lg px-8 py-3">
                Get Started
              </Link>
              <Link
                href="/auth/signin"
                className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600"
              >
                Sign in <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            How It Works
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="card text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
              <span className="text-primary-600 font-bold text-xl">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Choose Your Doctor</h3>
            <p className="text-gray-600">
              Browse our network of qualified physicians and select a specialist
              in the relevant medical field.
            </p>
          </div>
          <div className="card text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
              <span className="text-primary-600 font-bold text-xl">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Consultation</h3>
            <p className="text-gray-600">
              Our AI takes your medical history, reviews documents and images,
              and generates a comprehensive assessment.
            </p>
          </div>
          <div className="card text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
              <span className="text-primary-600 font-bold text-xl">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Doctor Review</h3>
            <p className="text-gray-600">
              Your chosen physician reviews the AI assessment, adds their expert
              opinion, and delivers the final consultation.
            </p>
          </div>
        </div>
      </div>

      {/* For Doctors and Patients */}
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="card">
              <h3 className="text-xl font-bold text-primary-700 mb-4">
                For Doctors
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">&#10003;</span>
                  Create your personalized medical portal
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">&#10003;</span>
                  Configure AI with your guidelines and protocols
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">&#10003;</span>
                  Review AI-generated summaries and differential diagnoses
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">&#10003;</span>
                  Edit and approve consultations before delivery
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">&#10003;</span>
                  Manage all patient consultations from one dashboard
                </li>
              </ul>
            </div>
            <div className="card">
              <h3 className="text-xl font-bold text-emerald-700 mb-4">
                For Patients
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2 mt-1">&#10003;</span>
                  Browse qualified specialists in various medical fields
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2 mt-1">&#10003;</span>
                  Chat with AI that follows your doctor&apos;s medical protocols
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2 mt-1">&#10003;</span>
                  Upload medical documents, images, and test results
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2 mt-1">&#10003;</span>
                  Receive comprehensive case summaries with differential diagnoses
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2 mt-1">&#10003;</span>
                  Get doctor-reviewed and approved final opinions
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>MedWare &mdash; AI Medical Consultation Platform</p>
          <p className="mt-1">
            This platform provides AI-assisted second opinions reviewed by
            qualified physicians. It is not a substitute for emergency medical
            care.
          </p>
        </div>
      </footer>
    </div>
  );
}
