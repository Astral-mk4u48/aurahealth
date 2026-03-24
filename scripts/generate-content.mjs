const SUPABASE_URL = 'https://cvgvuymsmmholbwpiodm.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Z3Z1eW1zbW1ob2xid3Bpb2RtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMwNzg1NiwiZXhwIjoyMDg5ODgzODU2fQ.PaqkkNSBAwVyJDIKcNFnr3mlfUO4DZcpNL3029SVjMk'
const GEMINI_KEY = process.env.GEMINI_API_KEY

const exerciseCategories = [
  { muscle: 'chest', count: 40 },
  { muscle: 'back', count: 40 },
  { muscle: 'legs', count: 40 },
  { muscle: 'shoulders', count: 30 },
  { muscle: 'arms', count: 30 },
  { muscle: 'core', count: 30 },
  { muscle: 'cardio', count: 30 },
  { muscle: 'full body', count: 30 },
  { muscle: 'glutes', count: 30 },
  { muscle: 'no equipment', count: 30 },
]

const recipeCategories = [
  { tag: 'high protein', count: 60 },
  { tag: 'low carb', count: 60 },
  { tag: 'vegan', count: 50 },
  { tag: 'breakfast', count: 50 },
  { tag: 'lunch', count: 50 },
  { tag: 'dinner', count: 50 },
  { tag: 'under 15 mins', count: 50 },
  { tag: 'meal prep', count: 50 },
  { tag: 'snacks', count: 50 },
  { tag: 'smoothies', count: 30 },
]

async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8 }
      })
    }
  )
  const data = await res.json()
  let text = data.candidates[0].content.parts[0].text.trim()
  text = text.replace(/```json|```/g, '').trim()
  return JSON.parse(text)
}

async function insertToSupabase(items) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/library_content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(items)
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Insert error:', err)
  }
}

async function generateExercises() {
  console.log('Generating exercises...')
  for (const cat of exerciseCategories) {
    console.log(`Generating ${cat.count} ${cat.muscle} exercises...`)
    try {
      const exercises = await callGemini(`Generate ${cat.count} unique ${cat.muscle} exercises. Return ONLY a raw JSON array with no markdown. Each item must have exactly these fields:
      {"title": "Exercise Name", "short_desc": "One sentence description", "long_content": "3-4 sentences on form and tips", "difficulty": "Beginner or Intermediate or Advanced", "equipment": "equipment needed or None", "tags": ["${cat.muscle}", "one more relevant tag"]}`)

      const formatted = exercises.map(e => ({
        type: 'exercise',
        title: e.title,
        short_desc: e.short_desc,
        long_content: e.long_content,
        data_points: { difficulty: e.difficulty, equipment: e.equipment, muscle_groups: [cat.muscle] },
        tags: e.tags
      }))

      await insertToSupabase(formatted)
      console.log(`✓ Inserted ${formatted.length} ${cat.muscle} exercises`)
      await new Promise(r => setTimeout(r, 3000))
    } catch (err) {
      console.error(`Error generating ${cat.muscle} exercises:`, err.message)
    }
  }
}

async function generateRecipes() {
  console.log('Generating recipes...')
  for (const cat of recipeCategories) {
    console.log(`Generating ${cat.count} ${cat.tag} recipes...`)
    try {
      const recipes = await callGemini(`Generate ${cat.count} unique ${cat.tag} recipes. Return ONLY a raw JSON array with no markdown. Each item must have exactly these fields:
      {"title": "Recipe Name", "short_desc": "One sentence description", "long_content": "Step by step instructions in 4-5 sentences", "calories": 000, "protein": 00, "carbs": 00, "fat": 00, "prep_time": "X mins", "tags": ["${cat.tag}", "breakfast or lunch or dinner or snack"]}`)

      const formatted = recipes.map(r => ({
        type: 'recipe',
        title: r.title,
        short_desc: r.short_desc,
        long_content: r.long_content,
        data_points: { calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat, prep_time: r.prep_time },
        tags: r.tags
      }))

      await insertToSupabase(formatted)
      console.log(`✓ Inserted ${formatted.length} ${cat.tag} recipes`)
      await new Promise(r => setTimeout(r, 3000))
    } catch (err) {
      console.error(`Error generating ${cat.tag} recipes:`, err.message)
    }
  }
}

async function main() {
  console.log('Starting content generation...')
  await generateExercises()
  await generateRecipes()
  console.log('Done! All content generated and inserted.')
}

main()
