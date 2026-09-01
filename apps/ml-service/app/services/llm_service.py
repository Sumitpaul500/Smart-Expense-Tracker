import os
from dotenv import load_dotenv

load_dotenv()


class FinancialAssistant:
    def __init__(self):
        self.system_prompt = (
            "You are FinPilot AI, an elite financial advisor. "
            "Analyze the user's query and provide actionable, data-driven financial advice. "
            "Be concise, professional, and helpful. Respond in plain text without markdown."
        )

    def generate_response(self, query: str, context: str = "No additional context."):
        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key or groq_key.strip() in ("YOUR_GROQ_API_KEY", "", "null"):
            return "Error: GROQ_API_KEY is missing. Please configure it to enable AI features."

        try:
            from groq import Groq

            client = Groq(api_key=groq_key)

            response = client.chat.completions.create(
                model="groq/compound",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": f"Context: {context}\n\nUser: {query}"},
                ],
                temperature=0.3,
                max_tokens=512,
            )
            return response.choices[0].message.content

        except Exception as e:
            err = str(e)
            # Fallback to lighter model on rate limit
            try:
                from groq import Groq
                client = Groq(api_key=groq_key)
                response = client.chat.completions.create(
                    model="groq/compound-mini",
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": f"Context: {context}\n\nUser: {query}"},
                    ],
                    temperature=0.3,
                    max_tokens=512,
                )
                return response.choices[0].message.content
            except Exception as e2:
                return f"AI temporarily unavailable: {str(e2)}"


assistant = FinancialAssistant()
