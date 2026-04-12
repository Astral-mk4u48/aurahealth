import Link from 'next/link'

export default function Privacy() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <div className="space-y-3">
          <Link href="/login" className="text-gray-500 hover:text-white text-sm">← Back</Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center justify-center text-xl">🔒</div>
            <div>
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
              <p className="text-gray-500 text-sm">Effective April 11, 2026 · myaurahealth.vercel.app</p>
            </div>
          </div>
        </div>

        <div className="bg-green-950/30 border border-green-800/50 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <p className="text-green-400 font-semibold">Privacy-First Architecture</p>
            <p className="text-gray-400 text-sm mt-1">Your private health data is protected by Row Level Security. Only you can access your personal metrics.</p>
          </div>
        </div>

        <div className="space-y-8">
          {[
            {
              title: 'I. Data We Collect',
              content: 'We collect your email address and name provided via authentication, fitness metrics and wellness data you log on the platform, and technical data such as IP address and browser type for security monitoring.'
            },
            {
              title: 'II. How We Use Your Data',
              content: 'Your data is used to generate personalized wellness reports and AI insights, to facilitate social features and community leaderboards using only your display name and daily progress, and to provide you with a personalized health tracking experience.'
            },
            {
              title: 'III. Data Security',
              content: 'All data is stored securely in Supabase with Row Level Security (RLS), ensuring your private health data is only accessible to you. Our application is hosted on Vercel with industry-standard SSL/TLS encryption. Data is encrypted at rest and in transit.'
            },
            {
              title: 'IV. Third-Party Providers',
              content: 'Your data may be processed by Supabase for database and authentication, Vercel for hosting, and Google Gemini for AI-powered features. These providers are bound by their own privacy policies and applicable data protection laws.'
            },
            {
              title: 'V. Social Features & Visibility',
              content: 'When using social features, only your display name and daily calorie progress are visible to other group members. Your detailed logs, body metrics, and personal health data are never shared and remain strictly private.'
            },
            {
              title: 'VI. Your Rights',
              content: 'You may update your profile at any time via Settings. You have the right to delete your account — upon deletion, all personal data associated with your account will be permanently and irreversibly purged from our database. You can request deletion from your Profile page.'
            },
            {
              title: 'VII. Updates',
              content: 'We may update this policy as new features are added. Continued use of the Platform after updates constitutes acceptance of the revised policy.'
            },
          ].map((section) => (
            <div key={section.title} className="bg-gray-900 rounded-2xl p-6 space-y-3">
              <h2 className="text-lg font-bold text-white">{section.title}</h2>
              <p className="text-gray-300 leading-relaxed text-sm">{section.content}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-6 flex items-center justify-between text-sm text-gray-600">
          <span>© 2026 AuraHealth</span>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service →</Link>
        </div>
      </div>
    </main>
  )
}