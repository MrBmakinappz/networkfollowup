-- Country to Language Mappings
-- Maps country codes to default languages for email templates

INSERT INTO country_mappings (user_id, custom_code, iso_code, country_name, language) VALUES
-- English-speaking countries
(NULL, 'USA', 'USA', 'United States', 'en'),
(NULL, 'US', 'USA', 'United States', 'en'),
(NULL, 'UK', 'GBR', 'United Kingdom', 'en'),
(NULL, 'GB', 'GBR', 'United Kingdom', 'en'),
(NULL, 'CAN', 'CAN', 'Canada', 'en'),
(NULL, 'CA', 'CAN', 'Canada', 'en'),
(NULL, 'AUS', 'AUS', 'Australia', 'en'),
(NULL, 'AU', 'AUS', 'Australia', 'en'),
(NULL, 'NZ', 'NZL', 'New Zealand', 'en'),
(NULL, 'NZL', 'NZL', 'New Zealand', 'en'),
(NULL, 'IRL', 'IRL', 'Ireland', 'en'),
(NULL, 'IE', 'IRL', 'Ireland', 'en'),

-- Italian-speaking countries
(NULL, 'ITA', 'ITA', 'Italy', 'it'),
(NULL, 'IT', 'ITA', 'Italy', 'it'),
(NULL, 'CHI', 'CHE', 'Switzerland (Italian)', 'it'),

-- Spanish-speaking countries
(NULL, 'ESP', 'ESP', 'Spain', 'es'),
(NULL, 'ES', 'ESP', 'Spain', 'es'),
(NULL, 'MEX', 'MEX', 'Mexico', 'es'),
(NULL, 'MX', 'MEX', 'Mexico', 'es'),
(NULL, 'ARG', 'ARG', 'Argentina', 'es'),
(NULL, 'AR', 'ARG', 'Argentina', 'es'),
(NULL, 'COL', 'COL', 'Colombia', 'es'),
(NULL, 'CO', 'COL', 'Colombia', 'es'),
(NULL, 'CHL', 'CHL', 'Chile', 'es'),
(NULL, 'CL', 'CHL', 'Chile', 'es'),
(NULL, 'PER', 'PER', 'Peru', 'es'),
(NULL, 'PE', 'PER', 'Peru', 'es'),
(NULL, 'VEN', 'VEN', 'Venezuela', 'es'),
(NULL, 'VE', 'VEN', 'Venezuela', 'es'),
(NULL, 'ECU', 'ECU', 'Ecuador', 'es'),
(NULL, 'EC', 'ECU', 'Ecuador', 'es'),
(NULL, 'GTM', 'GTM', 'Guatemala', 'es'),
(NULL, 'GT', 'GTM', 'Guatemala', 'es'),
(NULL, 'CUB', 'CUB', 'Cuba', 'es'),
(NULL, 'CU', 'CUB', 'Cuba', 'es'),
(NULL, 'DOM', 'DOM', 'Dominican Republic', 'es'),
(NULL, 'DO', 'DOM', 'Dominican Republic', 'es'),
(NULL, 'HND', 'HND', 'Honduras', 'es'),
(NULL, 'HN', 'HND', 'Honduras', 'es'),
(NULL, 'PRY', 'PRY', 'Paraguay', 'es'),
(NULL, 'PY', 'PRY', 'Paraguay', 'es'),
(NULL, 'SLV', 'SLV', 'El Salvador', 'es'),
(NULL, 'SV', 'SLV', 'El Salvador', 'es'),
(NULL, 'NIC', 'NIC', 'Nicaragua', 'es'),
(NULL, 'NI', 'NIC', 'Nicaragua', 'es'),
(NULL, 'CRI', 'CRI', 'Costa Rica', 'es'),
(NULL, 'CR', 'CRI', 'Costa Rica', 'es'),
(NULL, 'PAN', 'PAN', 'Panama', 'es'),
(NULL, 'PA', 'PAN', 'Panama', 'es'),
(NULL, 'URY', 'URY', 'Uruguay', 'es'),
(NULL, 'UY', 'URY', 'Uruguay', 'es'),
(NULL, 'BOL', 'BOL', 'Bolivia', 'es'),
(NULL, 'BO', 'BOL', 'Bolivia', 'es'),

-- German-speaking countries
(NULL, 'DEU', 'DEU', 'Germany', 'de'),
(NULL, 'DE', 'DEU', 'Germany', 'de'),
(NULL, 'GER', 'DEU', 'Germany', 'de'),
(NULL, 'AUT', 'AUT', 'Austria', 'de'),
(NULL, 'AT', 'AUT', 'Austria', 'de'),
(NULL, 'CHE', 'CHE', 'Switzerland', 'de'),
(NULL, 'CH', 'CHE', 'Switzerland', 'de'),
(NULL, 'LIE', 'LIE', 'Liechtenstein', 'de'),
(NULL, 'LI', 'LIE', 'Liechtenstein', 'de'),

-- French-speaking countries
(NULL, 'FRA', 'FRA', 'France', 'fr'),
(NULL, 'FR', 'FRA', 'France', 'fr'),
(NULL, 'BEL', 'BEL', 'Belgium', 'fr'),
(NULL, 'BE', 'BEL', 'Belgium', 'fr'),
(NULL, 'CHF', 'CHE', 'Switzerland (French)', 'fr'),
(NULL, 'LUX', 'LUX', 'Luxembourg', 'fr'),
(NULL, 'LU', 'LUX', 'Luxembourg', 'fr'),
(NULL, 'MCO', 'MCO', 'Monaco', 'fr'),
(NULL, 'MC', 'MCO', 'Monaco', 'fr'),

-- Polish
(NULL, 'POL', 'POL', 'Poland', 'pl'),
(NULL, 'PL', 'POL', 'Poland', 'pl'),

-- Bulgarian
(NULL, 'BGR', 'BGR', 'Bulgaria', 'bg'),
(NULL, 'BG', 'BGR', 'Bulgaria', 'bg'),

-- Czech
(NULL, 'CZE', 'CZE', 'Czech Republic', 'cs'),
(NULL, 'CZ', 'CZE', 'Czech Republic', 'cs'),

-- Romanian
(NULL, 'ROU', 'ROU', 'Romania', 'ro'),
(NULL, 'RO', 'ROU', 'Romania', 'ro'),
(NULL, 'MDA', 'MDA', 'Moldova', 'ro'),
(NULL, 'MD', 'MDA', 'Moldova', 'ro'),

-- Slovak
(NULL, 'SVK', 'SVK', 'Slovakia', 'sk'),
(NULL, 'SK', 'SVK', 'Slovakia', 'sk')

ON CONFLICT (user_id, custom_code) DO NOTHING;

-- Create function to get language from country code
CREATE OR REPLACE FUNCTION get_language_from_country(country_code VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    RETURN (
        SELECT language 
        FROM country_mappings 
        WHERE user_id IS NULL 
        AND (custom_code = UPPER(country_code) OR iso_code = UPPER(country_code))
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;
