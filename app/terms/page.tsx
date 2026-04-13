import Link from 'next/link'

export default function Terms() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <div className="space-y-3">
          <Link href="/login" className="text-gray-500 hover:text-white text-sm">← Back</Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center justify-center text-xl">⚖️</div>
            <div>
              <h1 className="text-3xl font-bold">Terms of Service</h1>
              <p className="text-gray-500 text-sm">Effective April 11, 2026 · therunehealth.vercel.app</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {[
            {
              title: 'I. Acceptance of Terms',
              content: 'By accessing or using Rune Health (the "Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform.'
            },
            {
              title: 'II. Medical Disclaimer',
              content: 'Rune Health is not a medical provider. The Platform provides tools for tracking fitness and wellness metrics for informational purposes only. The content is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.',
              highlight: true
            },
            {
              title: 'III. Eligibility & Account Security',
              content: 'You must be at least 13 years of age to use this Platform. You are responsible for maintaining the confidentiality of your account credentials. Rune Health utilizes Supabase for authentication; however, you are responsible for all activities that occur under your account.'
            },
            {
              title: 'IV. Acceptable Use',
              content: 'When using the social features of Rune Health, you agree not to post content that is illegal, defamatory, or harassing, attempt to manipulate fitness leaderboards, or interfere with the security or performance of the Platform. We reserve the right to terminate your access for violations of these guidelines.'
            },
            {
              title: 'V. Intellectual Property',
              content: 'The Rune Health brand, logo, and original source code are the intellectual property of the Platform founder. You may not reproduce or distribute our intellectual property without express written permission.'
            },
            {
              title: 'VI. Limitation of Liability',
              content: 'Rune Health is provided on an "as-is" and "as-available" basis. We make no warranties regarding the accuracy of data or 100% uptime. To the maximum extent permitted by law, Rune Health and its creator shall not be liable for any indirect or consequential damages.'
            },
          ].map((section) => (
            <div key={section.title} className={`rounded-2xl p-6 space-y-3 ${section.highlight ? 'bg-yellow-950/30 border border-yellow-800/50' : 'bg-gray-900'}`}>
              <h2 className={`text-lg font-bold ${section.highlight ? 'text-yellow-400' : 'text-white'}`}>{section.title}</h2>
              <p className="text-gray-300 leading-relaxed text-sm">{section.content}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-6 flex items-center justify-between text-sm text-gray-600">
          <span>© 2026 Rune Health</span>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy →</Link>
        </div>
      </div>
    </main>
  )
}