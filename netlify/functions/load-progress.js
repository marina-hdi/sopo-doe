const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.handler = async (event) => {
    const { id } = JSON.parse(event.body);

    const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
    return { statusCode: 200, body: JSON.stringify(data) };
};
