import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { guardian_email, student_name, token } = await req.json()

    if (!guardian_email || !token) {
      return new Response("Missing email or token", { status: 400 })
    }
    
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      },
      body: JSON.stringify({
        from: "Nexa <onboarding@resend.dev>",
        to: guardian_email,
        subject: `Consent required for ${student_name}`,
        html: `
          <h2>Hello,</h2>
          <p>A young person named ${student_name} has signed up for Nexa and listed you as their guardian.</p>
          <p>Click the link below to review the safety measures and activate their account:</p>
          <a href="http://localhost:3000/guardian-consent/${token}">Review and Consent</a>
        `,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(err)
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})