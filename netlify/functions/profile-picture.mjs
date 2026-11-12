import { getStore } from "@netlify/blobs";

const STORE_NAME = "alfred-enterprise-profile";

export default async (request) => {
    const store = getStore(STORE_NAME);

    if (request.method === "GET") {
        try {
            const data = supportJSON(await store.get("profile", { type: "json" }));
            const pictureUrl = data?.picture || data?.url || (typeof data === "string" ? data : null);
            
            return new Response(JSON.stringify({ picture: pictureUrl }), {
                status: 200,
                headers: { 
                    "Content-Type": "application/json", 
                    "Cache-Control": "no-store, no-cache, must-revalidate" 
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({ picture: null }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    if (request.method === "PUT" || request.method === "POST") {
        try {
            const rawBody = await request.text();
            const payload = rawBody ? JSON.parse(rawBody) : {};

            const expectedKey = Netlify.env.get("PROFILE_UPLOAD_KEY");
            const suppliedKey = 
                request.headers.get("x-profile-upload-key") || 
                request.headers.get("x-admin-key") || 
                payload.key || payload.password;

            if (expectedKey && suppliedKey !== expectedKey) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                });
            }

            const pictureUrl = payload.picture || payload.url || (typeof payload === "string" ? payload : null);
            await store.setJSON("profile", { picture: pictureUrl });

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message || "Failed to save" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    return new Response("Method not allowed", { status: 405 });
};

function supportJSON(val) {
    if (!val) return null;
    if (typeof val === "object") return val;
    try { return JSON.parse(val); } catch (e) { return { picture: val }; }
}
