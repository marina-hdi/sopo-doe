const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
    const { data, error } = await supabase
        .from('progress')
        .select('id');

    if (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }

    const ids = data.map(row => row.id);

    return {
        statusCode: 200,
        body: JSON.stringify({ ids })
    };
};
