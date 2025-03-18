const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.handler = async (event) => {
    const data = JSON.parse(event.body);

    console.log("BACKEND RECEIVED ID:", data.id);

    const { error } = await supabase
        .from('progress')
        .upsert([data], { onConflict: 'id' }); // ✅ this will REPLACE if the ID already exists

    if (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, body: JSON.stringify({ id: data.id || null }) };
};
