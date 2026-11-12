import { getStore } from "@netlify/blobs";

const STORE_NAME = "alfred-enterprise-products";

export default async (request) => {
    const store = getStore(STORE_NAME);

    if (request.method === "GET") {
        try {
            const data = await store.get("products", { type: "json" });
            const products = Array.isArray(data) ? data : (data?.products || []);
            return new Response(JSON.stringify({ products }), {
                status: 200,
                headers: { 
                    "Content-Type": "application/json", 
                    "Cache-Control": "no-store, no-cache, must-revalidate" 
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({ products: [] }), {
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

            let productsToSave = payload.products || payload.product || payload;
            if (!Array.isArray(productsToSave)) {
                productsToSave = [productsToSave];
            }

            await store.setJSON("products", { products: productsToSave });

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
