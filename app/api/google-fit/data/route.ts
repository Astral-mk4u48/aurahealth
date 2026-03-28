import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { accessToken } = await request.json()

  const now = Date.now()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const startMs = startOfDay.getTime()

  const body = {
    aggregateBy: [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.heart_rate.bpm' },
      { dataTypeName: 'com.google.distance.delta' },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: startMs,
    endTimeMillis: now,
  }

  const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  let steps = 0
  let calories = 0
  let heartRate = 0
  let distance = 0

  if (data.bucket) {
    data.bucket.forEach((bucket: any) => {
      bucket.dataset.forEach((dataset: any) => {
        dataset.point.forEach((point: any) => {
          const type = dataset.dataSourceId
          if (type.includes('step_count')) steps += point.value[0]?.intVal || 0
          if (type.includes('calories')) calories += point.value[0]?.fpVal || 0
          if (type.includes('heart_rate')) heartRate = Math.max(heartRate, point.value[0]?.fpVal || 0)
          if (type.includes('distance')) distance += point.value[0]?.fpVal || 0
        })
      })
    })
  }

  return NextResponse.json({
    steps: Math.round(steps),
    calories: Math.round(calories),
    heartRate: Math.round(heartRate),
    distance: Math.round(distance / 1000 * 10) / 10,
  })
}