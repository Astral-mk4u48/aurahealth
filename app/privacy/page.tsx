export default function Privacy() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="text-gray-400 mt-2">Effective Date: April 11, 2026 · Platform: myaurahealth.vercel.app</p>
        </div>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">I. Data Collection</h2>
            <p>We collect the following information to provide our services: your email address and name provided via Supabase Auth, fitness metrics and wellness data you log on the platform, and technical data such as IP address and browser type for security monitoring.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">II. How We Use Your Data</h2>
            <p>Your data is used to generate personalized wellness reports and AI insights, to facilitate social features and community leaderboards, and to provide you with a personalized health tracking experience.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">III. Data Infrastructure & Security</h2>
            <p>All data is stored securely in Supabase with Row Level Security (RLS), ensuring your private health data is only accessible to you. Our application is hosted on Vercel with industry-standard SSL/TLS encryption. Data is encrypted at rest and in transit.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">IV. Third-Party Service Providers</h2>
            <p>To maintain Platform functionality, your data may be processed by Supabase for database and authentication, Vercel for hosting, and Google Gemini for AI-powered features. These providers are bound by their own privacy policies and applicable data protection laws.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">V. Social Features & Data Visibility</h2>
            <p>When using social features, your display name and daily calorie progress are visible to other members of groups you join. Your private health data, detailed logs, and personal metrics are never shared and remain strictly private to your account.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">VI. Your Rights</h2>
            <p>You may update your profile information at any time via the Platform settings. You have the right to delete your account — upon deletion, all personal data associated with your account will be permanently purged from our database. You can request account deletion from your Profile settings page.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">VII. Contact & Updates</h2>
            <p>We may update this policy as new features are added. Continued use of the Platform after updates constitutes acceptance of the revised policy.</p>
          </section>
        </div>
      </div>
    </main>
  )
}