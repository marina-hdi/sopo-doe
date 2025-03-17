const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.handler = async (event) => {
    const data = JSON.parse(event.body);

    const { error } = await supabase
        .from('progress')
        .insert([data]);

    if (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, body: JSON.stringify({ id: data.id }) };
};
