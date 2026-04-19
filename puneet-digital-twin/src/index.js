/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "openai/gpt-oss-120b:free";
const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 1200;

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

const PROFILE_CONTEXT = `
Name: Puneet Nahata
Title: Principal Software Engineer

About Me:
- Principal-level backend and distributed systems engineer with 18+ years of experience.
- Focuses on revenue-critical systems with high availability, low latency, and measurable business impact.
- Known for architecture leadership, modernization of legacy platforms, and engineering mentorship.

Experience:
- JPMorgan Chase (Senior Lead Software Engineer, Nov 2025 - Present):
  Leads Chase Travel re-architecture and modernization of resilient service-oriented backend systems.
  Supports core workflows powering a $10B+ annual bookings business.
- Amazon AdTech (Software Engineer, 2022 - 2025):
  Architected Programmable Bidder (an AdTech Demand-Side Platform, DSP) with +40% bid optimization and +25% revenue per impression.
  Delivered Prime Video Pod Bidding generating $100M+ annually.
  Scaled auction systems to 15M+ TPS peaks across 22K+ hosts with 99.99% uptime and sub-40ms p99 latency.
  Reduced infrastructure cost by $2M+ annually via caching and optimization.
- M&T Bank (Principal Engineer, 2021 - 2022):
  Built DevPortal and a secure service framework to improve developer productivity and reduce boilerplate.
  Drove cloud-native and event-driven engineering practices.
- Amazon Seller Systems (Software Engineer, 2019 - 2021):
  Built data processing systems for 20M+ sellers at 150K TPS.
  Led migration to AWS and improved security via OAuth2.
- Priceline (Senior Software Engineer, 2014 - 2019):
  Led travel platform redesign contributing to 2x annual booking revenue growth.
  Built a 50TB+ distributed cache at 30K TPS and under 25ms latency.
  Improved itinerary relevance by 85%, API performance by 30%, and reduced cart abandonment by 25%.
- Early career at Cognizant and Infosys (2007 - 2014):
  Built multi-tier enterprise applications and workflow automation, including production support and team leadership.

Projects and Architecture Highlights:
- Programmable Bidder (DSP) in AdTech.
- Prime Video Pod Bidding monetization platform.
- Distributed airlines cache and indexing platform.
- High-scale reliability architecture for large host fleets and peak events.

Skills:
- Backend: Java, Spring Boot, REST, gRPC, concurrency.
- Distributed systems: event-driven architecture, fault tolerance, caching, latency optimization, load management.
- Cloud and infrastructure: AWS, Kubernetes, Docker, CI/CD, observability.
- Data: MySQL, DynamoDB, Redis, Elasticsearch, Kafka.

Contact:
- LinkedIn: https://www.linkedin.com/in/puneetnahata
`;

function jsonResponse(payload, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...CORS_HEADERS,
		},
	});
}

function buildSystemPrompt() {
	return [
		"You are the Digital Twin of Puneet Nahata, Principal Software Engineer.",
		"Answer only using the profile context below. Do not use external knowledge.",
		"If a detail is not present in the profile, say: 'I do not have that information in my profile.'",
		"Style rules: concise, confident, professional, and factual.",
		"Formatting rules: use short paragraphs and simple bullets; avoid markdown decorations like **bold** and backticks unless explicitly asked.",
		"Do not fabricate metrics, dates, companies, or technologies.",
		"",
		"PROFILE CONTEXT",
		PROFILE_CONTEXT.trim(),
	].join("\n");
}

function sanitizeHistory(history) {
	if (!Array.isArray(history)) return [];

	return history
		.filter((entry) => entry && (entry.role === "user" || entry.role === "assistant") && typeof entry.content === "string")
		.map((entry) => ({
			role: entry.role,
			content: entry.content.trim().slice(0, MAX_MESSAGE_LENGTH),
		}))
		.filter((entry) => entry.content.length > 0)
		.slice(-MAX_HISTORY_MESSAGES);
}

function extractReply(openRouterResponse) {
	const content = openRouterResponse?.choices?.[0]?.message?.content;
	if (typeof content === "string" && content.trim()) {
		return content.trim();
	}

	if (Array.isArray(content)) {
		const text = content
			.map((part) => {
				if (typeof part === "string") return part;
				if (part && typeof part.text === "string") return part.text;
				return "";
			})
			.join("")
			.trim();
		if (text) return text;
	}

	return null;
}

function isRateLimited(_request) {
	// Placeholder hook: replace with KV or Durable Objects for real IP/window rate limiting.
	return false;
}

async function handleChat(request, env) {
	if (!env.OPENROUTER_API_KEY) {
		return jsonResponse({ error: "Server misconfigured: missing OPENROUTER_API_KEY." }, 500);
	}

	if (isRateLimited(request)) {
		return jsonResponse({ error: "Rate limit exceeded. Please try again later." }, 429);
	}

	const requestBody = await request.json().catch(() => null);
	const history = sanitizeHistory(requestBody?.history);
	const requestOrigin = request.headers.get("Origin") || "https://example.com";

	const messages = [
		{ role: "system", content: buildSystemPrompt() },
		...history,
	];

	const apiResponse = await fetch(OPENROUTER_API_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
			"Content-Type": "application/json",
			"HTTP-Referer": requestOrigin,
			"X-Title": "Puneet Nahata Digital Twin",
		},
		body: JSON.stringify({
			model: MODEL_NAME,
			messages,
			temperature: 0.2,
			max_tokens: 350,
		}),
	});

	const apiJson = await apiResponse.json().catch(() => null);
	if (!apiResponse.ok) {
		const apiError = apiJson?.error?.message || apiJson?.error || "OpenRouter API call failed.";
		return jsonResponse({ error: apiError }, apiResponse.status);
	}

	const reply = extractReply(apiJson);
	if (!reply) {
		return jsonResponse({ error: "Model returned an empty response." }, 502);
	}

	return jsonResponse({ reply });
}

export default {
	async fetch(request, env) {
		try {
			if (request.method === "OPTIONS") {
				return new Response(null, { status: 204, headers: CORS_HEADERS });
			}

			if (request.method !== "POST") {
				return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
			}

			return handleChat(request, env);
		} catch (error) {
			return jsonResponse(
				{ error: "Unexpected server error.", detail: error instanceof Error ? error.message : "Unknown error." },
				500
			);
		}
	},
};
