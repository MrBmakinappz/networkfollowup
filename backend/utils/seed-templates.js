// utils/seed-templates.js
// Auto-seed email templates on server startup

const db = require('../config/database');
const { log, error } = require('./logger');

/**
 * Seed default email templates if they don't exist
 * Creates 15 templates: 3 customer types × 5 languages
 */
async function seedTemplates() {
    try {
        log('🔵 Checking if email templates exist...');

        // Check if templates already exist
        const countResult = await db.query('SELECT COUNT(*) as count FROM public.email_templates');
        const count = parseInt(countResult.rows[0].count);

        if (count > 0) {
            log(`✅ Email templates already exist (${count} templates)`);
            return;
        }

        log('🔵 No templates found, seeding default templates...');

        // Templates data
        const templates = [
            // RETAIL TEMPLATES
            {
                customer_type: 'retail',
                language: 'en',
                name: 'Retail Follow-up - English',
                subject: 'Hi {{firstname}}, your 25% doTERRA discount is waiting!',
                body: `Hi {{firstname}},

I hope you're doing well! I wanted to reach out because I noticed you've been shopping with us as a retail customer.

Did you know you can save 25% on all doTERRA products by becoming a Wholesale Customer? It's a one-time $35 enrollment fee that pays for itself with your first order.

Plus, you'll get access to:
• 25% automatic savings on all products
• Free Product of the Month
• No monthly purchase requirements

Would you like me to help you get set up? Just reply to this email and I'll walk you through it.

Best regards,
{{your-name}}`
            },
            {
                customer_type: 'retail',
                language: 'it',
                name: 'Retail Follow-up - Italian',
                subject: 'Ciao {{firstname}}, il tuo sconto del 25% ti aspetta!',
                body: `Ciao {{firstname}},

Spero tu stia bene! Volevo contattarti perché ho notato che hai fatto acquisti come cliente retail.

Sapevi che puoi risparmiare il 25% su tutti i prodotti doTERRA diventando Cliente Wholesale? È una quota unica di €35 che si ripaga con il tuo primo ordine.

Inoltre, avrai accesso a:
• 25% di risparmio automatico su tutti i prodotti
• Prodotto del Mese gratuito
• Nessun acquisto mensile obbligatorio

Vuoi che ti aiuti a registrarti? Rispondi semplicemente a questa email e ti guiderò passo dopo passo.

Un saluto,
{{your-name}}`
            },
            {
                customer_type: 'retail',
                language: 'de',
                name: 'Retail Follow-up - German',
                subject: 'Hallo {{firstname}}, Ihr 25% doTERRA Rabatt wartet auf Sie!',
                body: `Hallo {{firstname}},

Ich hoffe, es geht Ihnen gut! Ich wollte mich melden, weil ich bemerkt habe, dass Sie als Einzelhandelskunde bei uns einkaufen.

Wussten Sie, dass Sie 25% auf alle doTERRA-Produkte sparen können, indem Sie Großhandelskunde werden? Es ist eine einmalige Anmeldegebühr von 35€, die sich bereits mit Ihrer ersten Bestellung bezahlt macht.

Außerdem erhalten Sie Zugang zu:
• 25% automatischer Rabatt auf alle Produkte
• Kostenloses Produkt des Monats
• Keine monatlichen Einkaufsanforderungen

Möchten Sie, dass ich Ihnen beim Einrichten helfe? Antworten Sie einfach auf diese E-Mail und ich führe Sie durch den Prozess.

Mit freundlichen Grüßen,
{{your-name}}`
            },
            {
                customer_type: 'retail',
                language: 'fr',
                name: 'Retail Follow-up - French',
                subject: 'Salut {{firstname}}, votre réduction de 25% vous attend!',
                body: `Salut {{firstname}},

J'espère que vous allez bien ! Je voulais vous contacter car j'ai remarqué que vous avez fait des achats en tant que client retail.

Saviez-vous que vous pouvez économiser 25% sur tous les produits doTERRA en devenant client en gros ? C'est un frais d'inscription unique de 35€ qui se rentabilise avec votre première commande.

De plus, vous aurez accès à :
• 25% de réduction automatique sur tous les produits
• Produit du mois gratuit
• Aucune obligation d'achat mensuel

Souhaitez-vous que je vous aide à vous inscrire ? Répondez simplement à cet e-mail et je vous guiderai étape par étape.

Cordialement,
{{your-name}}`
            },
            {
                customer_type: 'retail',
                language: 'es',
                name: 'Retail Follow-up - Spanish',
                subject: 'Hola {{firstname}}, tu descuento del 25% te está esperando!',
                body: `Hola {{firstname}},

¡Espero que estés bien! Quería contactarte porque noté que has estado comprando como cliente retail.

¿Sabías que puedes ahorrar 25% en todos los productos doTERRA convirtiéndote en Cliente Mayorista? Es una tarifa única de inscripción de €35 que se paga sola con tu primer pedido.

Además, tendrás acceso a:
• 25% de ahorro automático en todos los productos
• Producto del Mes gratis
• Sin requisitos de compra mensual

¿Te gustaría que te ayude a registrarte? Simplemente responde a este correo y te guiaré paso a paso.

Saludos,
{{your-name}}`
            },
            // WHOLESALE TEMPLATES
            {
                customer_type: 'wholesale',
                language: 'en',
                name: 'Wholesale Follow-up - English',
                subject: 'Hi {{firstname}}, unlock your free products with LRP!',
                body: `Hi {{firstname}},

Great news! As a Wholesale Customer, you qualify for our Loyalty Rewards Program (LRP).

With LRP, you can:
• Earn up to 30% back in product credits
• Get the Product of the Month FREE
• Enjoy free shipping on LRP orders
• Your points never expire

Setting up LRP is easy and takes just a few minutes. Would you like me to help you get started?

Reply to this email and I'll guide you through the setup process.

Best regards,
{{your-name}}`
            },
            {
                customer_type: 'wholesale',
                language: 'it',
                name: 'Wholesale Follow-up - Italian',
                subject: 'Ciao {{firstname}}, sblocca prodotti gratuiti con LRP!',
                body: `Ciao {{firstname}},

Ottime notizie! Come Cliente Wholesale, hai diritto al nostro Programma Fedeltà (LRP).

Con LRP puoi:
• Guadagnare fino al 30% in crediti prodotto
• Ottenere il Prodotto del Mese GRATIS
• Godere della spedizione gratuita sugli ordini LRP
• I tuoi punti non scadono mai

Configurare LRP è semplice e richiede pochi minuti. Vuoi che ti aiuti a iniziare?

Rispondi a questa email e ti guiderò nel processo di configurazione.

Un saluto,
{{your-name}}`
            },
            {
                customer_type: 'wholesale',
                language: 'de',
                name: 'Wholesale Follow-up - German',
                subject: 'Hallo {{firstname}}, schalten Sie Ihre kostenlosen Produkte mit LRP frei!',
                body: `Hallo {{firstname}},

Großartige Neuigkeiten! Als Großhandelskunde qualifizieren Sie sich für unser Treueprogramm (LRP).

Mit LRP können Sie:
• Bis zu 30% in Produktguthaben verdienen
• Das Produkt des Monats KOSTENLOS erhalten
• Kostenlosen Versand bei LRP-Bestellungen genießen
• Ihre Punkte laufen niemals ab

Die Einrichtung von LRP ist einfach und dauert nur wenige Minuten. Möchten Sie, dass ich Ihnen beim Einstieg helfe?

Antworten Sie auf diese E-Mail und ich führe Sie durch den Einrichtungsprozess.

Mit freundlichen Grüßen,
{{your-name}}`
            },
            {
                customer_type: 'wholesale',
                language: 'fr',
                name: 'Wholesale Follow-up - French',
                subject: 'Salut {{firstname}}, débloquez vos produits gratuits avec LRP!',
                body: `Salut {{firstname}},

Excellente nouvelle ! En tant que client en gros, vous êtes éligible à notre Programme de Fidélité (LRP).

Avec LRP, vous pouvez :
• Gagner jusqu'à 30% en crédits produit
• Obtenir le Produit du Mois GRATUITEMENT
• Bénéficier de la livraison gratuite sur les commandes LRP
• Vos points n'expirent jamais

La configuration de LRP est simple et ne prend que quelques minutes. Souhaitez-vous que je vous aide à démarrer ?

Répondez à cet e-mail et je vous guiderai dans le processus de configuration.

Cordialement,
{{your-name}}`
            },
            {
                customer_type: 'wholesale',
                language: 'es',
                name: 'Wholesale Follow-up - Spanish',
                subject: 'Hola {{firstname}}, desbloquea productos gratis con LRP!',
                body: `Hola {{firstname}},

¡Excelentes noticias! Como Cliente Mayorista, calificas para nuestro Programa de Lealtad (LRP).

Con LRP puedes:
• Ganar hasta 30% en créditos de producto
• Obtener el Producto del Mes GRATIS
• Disfrutar de envío gratis en pedidos LRP
• Tus puntos nunca expiran

Configurar LRP es fácil y toma solo unos minutos. ¿Te gustaría que te ayude a comenzar?

Responde a este correo y te guiaré en el proceso de configuración.

Saludos,
{{your-name}}`
            },
            // ADVOCATE TEMPLATES
            {
                customer_type: 'advocates',
                language: 'en',
                name: 'Advocate Follow-up - English',
                subject: 'Hey {{firstname}}, let\'s grow your doTERRA business!',
                body: `Hey {{firstname}},

I hope this email finds you well! I wanted to reach out because I noticed you're a Wellness Advocate on my team, and I'd love to help you grow your business.

I'm offering a FREE 1-on-1 strategy session where we can:
• Review your current business goals
• Develop a personalized marketing plan
• Discuss team building strategies
• Plan your path to the next rank

These sessions have helped many Advocates grow their business significantly. I'd love to share these strategies with you.

Would you be interested in scheduling a call? Just reply to this email with your preferred time and I'll send you a calendar invite.

Let's build something great together!

Cheers,
{{your-name}}`
            },
            {
                customer_type: 'advocates',
                language: 'it',
                name: 'Advocate Follow-up - Italian',
                subject: 'Ciao {{firstname}}, facciamo crescere il tuo business doTERRA!',
                body: `Ciao {{firstname}},

Spero che questa email ti trovi bene! Volevo contattarti perché ho notato che sei un Wellness Advocate nel mio team e mi piacerebbe aiutarti a far crescere il tuo business.

Offro una sessione strategica GRATUITA 1-a-1 in cui possiamo:
• Rivedere i tuoi obiettivi di business attuali
• Sviluppare un piano di marketing personalizzato
• Discutere strategie di team building
• Pianificare il tuo percorso verso il prossimo livello

Queste sessioni hanno aiutato molti Advocate a far crescere significativamente il loro business. Mi piacerebbe condividere queste strategie con te.

Saresti interessato a programmare una chiamata? Rispondi semplicemente a questa email con il tuo orario preferito e ti invierò un invito calendario.

Costruiamo qualcosa di grande insieme!

A presto,
{{your-name}}`
            },
            {
                customer_type: 'advocates',
                language: 'de',
                name: 'Advocate Follow-up - German',
                subject: 'Hallo {{firstname}}, lassen Sie uns Ihr doTERRA-Geschäft wachsen!',
                body: `Hallo {{firstname}},

Ich hoffe, diese E-Mail erreicht Sie gut! Ich wollte mich melden, weil ich bemerkt habe, dass Sie ein Wellness Advocate in meinem Team sind und ich Ihnen gerne beim Wachstum Ihres Geschäfts helfen möchte.

Ich biete eine KOSTENLOSE 1-zu-1-Strategiesitzung an, in der wir können:
• Ihre aktuellen Geschäftsziele überprüfen
• Einen personalisierten Marketingplan entwickeln
• Team-Building-Strategien besprechen
• Ihren Weg zum nächsten Rang planen

Diese Sitzungen haben vielen Advocates geholfen, ihr Geschäft erheblich zu erweitern. Ich würde diese Strategien gerne mit Ihnen teilen.

Wären Sie interessiert, einen Anruf zu vereinbaren? Antworten Sie einfach auf diese E-Mail mit Ihrer bevorzugten Zeit und ich sende Ihnen eine Kalendereinladung.

Lassen Sie uns gemeinsam etwas Großartiges aufbauen!

Viele Grüße,
{{your-name}}`
            },
            {
                customer_type: 'advocates',
                language: 'fr',
                name: 'Advocate Follow-up - French',
                subject: 'Salut {{firstname}}, développons votre entreprise doTERRA!',
                body: `Salut {{firstname}},

J'espère que cet e-mail vous trouve en bonne santé ! Je voulais vous contacter car j'ai remarqué que vous êtes un Advocate Bien-être dans mon équipe, et j'aimerais vous aider à développer votre entreprise.

J'offre une session de stratégie GRATUITE en 1-à-1 où nous pouvons :
• Examiner vos objectifs commerciaux actuels
• Développer un plan de marketing personnalisé
• Discuter des stratégies de renforcement d'équipe
• Planifier votre chemin vers le rang suivant

Ces sessions ont aidé de nombreux Advocates à développer considérablement leur entreprise. J'aimerais partager ces stratégies avec vous.

Seriez-vous intéressé à planifier un appel ? Répondez simplement à cet e-mail avec votre heure préférée et je vous enverrai une invitation calendrier.

Construisons quelque chose de grand ensemble !

Cordialement,
{{your-name}}`
            },
            {
                customer_type: 'advocates',
                language: 'es',
                name: 'Advocate Follow-up - Spanish',
                subject: 'Hola {{firstname}}, ¡hagamos crecer tu negocio doTERRA!',
                body: `Hola {{firstname}},

¡Espero que este correo te encuentre bien! Quería contactarte porque noté que eres un Wellness Advocate en mi equipo y me encantaría ayudarte a hacer crecer tu negocio.

Ofrezco una sesión de estrategia GRATUITA 1-a-1 en la que podemos:
• Revisar tus objetivos comerciales actuales
• Desarrollar un plan de marketing personalizado
• Discutir estrategias de construcción de equipo
• Planificar tu camino al siguiente rango

Estas sesiones han ayudado a muchos Advocates a hacer crecer significativamente su negocio. Me encantaría compartir estas estrategias contigo.

¿Te gustaría programar una llamada? Simplemente responde a este correo con tu hora preferida y te enviaré una invitación de calendario.

¡Construyamos algo grande juntos!

Saludos,
{{your-name}}`
            }
        ];

        // Insert templates
        for (const template of templates) {
            await db.query(
                `INSERT INTO public.email_templates (customer_type, language, name, subject, body, is_active)
                 VALUES ($1, $2, $3, $4, $5, TRUE)
                 ON CONFLICT (customer_type, language) DO UPDATE SET
                    name = EXCLUDED.name,
                    subject = EXCLUDED.subject,
                    body = EXCLUDED.body,
                    is_active = TRUE,
                    updated_at = NOW()`,
                [template.customer_type, template.language, template.name, template.subject, template.body]
            );
        }

        log(`✅ Seeded ${templates.length} email templates successfully`);
    } catch (err) {
        error('❌ Error seeding templates:', err);
        // Don't throw - allow server to start even if seeding fails
        // Templates can be seeded manually later
    }
}

module.exports = { seedTemplates };











