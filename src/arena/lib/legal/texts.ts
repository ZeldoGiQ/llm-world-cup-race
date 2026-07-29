/**
 * Rechtstexte – bewusst als Daten, nicht als Textbaustein-Sammlung.
 *
 * Der Grundsatz hier: Es steht nur drin, was die Seite wirklich tut. Fertige
 * Datenschutz-Generatoren schreiben Absätze über Cookies, Kontaktformulare
 * und Analysedienste, die es hier alle nicht gibt – und eine Erklärung, die
 * Falsches behauptet, ist schlechter als eine kurze, die stimmt.
 *
 * Der Bestand, auf den sich diese Texte stützen (Stand: geprüft am Code):
 *   - keine Cookies, kein Tracking, keine Werbung, keine Nutzerkonten,
 *     keine Formulare, kein Newsletter
 *   - Schriften liegen auf dem eigenen Server (kein Google-Fonts-Abruf)
 *   - einziger Speicherzugriff: localStorage-Schlüssel "arena-theme"
 *   - externe Ziele ausschließlich als gewöhnliche Links mit noreferrer
 *   - eine Content-Security-Policy verbietet Verbindungen zu Dritten
 *
 * Ändert sich etwas davon, gehört dieser Text mitgeändert.
 */
import type { Locale } from '../i18n/locales';

export interface LegalSection {
  id: string;
  heading: string;
  /** Absätze; Zeichenketten werden als Text gesetzt, nicht als HTML. */
  body: string[];
  /** Optionale Aufzählung unter den Absätzen */
  list?: string[];
}

type Localized<T> = Record<Locale, T>;

const PRIVACY: Localized<LegalSection[]> = {
  de: [
    {
      id: 'kurz',
      heading: 'Das Wichtigste zuerst',
      body: [
        'Diese Seite setzt keine Cookies, bindet keine Analyse- oder Werbedienste ein und lädt keine Inhalte von fremden Servern nach. Es gibt keine Nutzerkonten, keine Formulare und keinen Newsletter. Wir erheben keine personenbezogenen Daten, um sie auszuwerten.',
        'Was technisch unvermeidbar anfällt, sind die Zugriffsdaten, die jeder Webserver beim Ausliefern einer Seite verarbeitet. Darum geht es im Wesentlichen in dieser Erklärung.',
      ],
    },
    {
      id: 'verantwortlich',
      heading: 'Verantwortlich',
      body: [
        'Verantwortlich für die Datenverarbeitung auf dieser Seite ist der im Impressum genannte Betreiber. Bei Fragen zum Datenschutz genügt eine formlose Nachricht an die dort angegebene Adresse.',
      ],
    },
    {
      id: 'server',
      heading: 'Zugriffsdaten beim Aufruf der Seite',
      body: [
        'Beim Aufruf einer Seite überträgt Ihr Browser technisch notwendige Daten an den Server. Diese werden in Server-Protokollen gespeichert:',
      ],
      list: [
        'IP-Adresse des anfragenden Geräts',
        'Datum und Uhrzeit der Anfrage',
        'aufgerufene Adresse und übertragene Datenmenge',
        'Browsertyp und Betriebssystem',
        'die zuvor besuchte Seite, sofern Ihr Browser sie übermittelt',
      ],
    },
    {
      id: 'zweck',
      heading: 'Zweck und Rechtsgrundlage',
      body: [
        'Diese Daten sind erforderlich, um die Seite auszuliefern, ihre Stabilität zu sichern und Angriffe abzuwehren. Rechtsgrundlage ist das berechtigte Interesse an einem sicheren und funktionierenden Angebot nach Artikel 6 Absatz 1 Buchstabe f der Datenschutz-Grundverordnung.',
        'Die Protokolle werden gelöscht, sobald sie für diese Zwecke nicht mehr erforderlich sind; die Aufbewahrungsfrist richtet sich nach den Vorgaben des Hosting-Anbieters. Länger gespeichert wird nur, was zur Aufklärung eines konkreten Sicherheitsvorfalls benötigt wird, und auch das nur so lange, bis die Aufklärung abgeschlossen ist.',
        'Eine Zusammenführung dieser Daten mit anderen Quellen findet nicht statt. Es gibt keine Auswertung des Nutzungsverhaltens, keine Profilbildung und keine automatisierte Entscheidungsfindung.',
      ],
    },
    {
      id: 'hosting',
      heading: 'Hosting',
      body: [
        'Die Seite wird bei Vercel Inc. gehostet. Der Anbieter verarbeitet die genannten Zugriffsdaten in unserem Auftrag auf Grundlage eines Vertrags zur Auftragsverarbeitung nach Artikel 28 der Datenschutz-Grundverordnung. Die Auslieferung erfolgt über Server in der Europäischen Union.',
        'Soweit dabei Daten in die Vereinigten Staaten übermittelt werden, stützt sich die Übermittlung auf den Angemessenheitsbeschluss der Europäischen Kommission zum EU-US Data Privacy Framework und ergänzend auf die Standardvertragsklauseln der Europäischen Kommission nach Artikel 46 Absatz 2 Buchstabe c der Datenschutz-Grundverordnung.',
      ],
    },
    {
      id: 'speicher',
      heading: 'Speicherung im Browser',
      body: [
        'Die Seite speichert genau einen Wert lokal in Ihrem Browser: unter dem Schlüssel „arena-theme" die Angabe, ob Sie die helle oder die dunkle Darstellung gewählt haben. Der Wert wird nur geschrieben, wenn Sie den Schalter selbst betätigen, er enthält keinerlei Personenbezug und wird niemals an einen Server übertragen.',
        'Weil er ausschließlich dazu dient, eine von Ihnen ausdrücklich gewünschte Einstellung zu bewahren, ist dafür keine Einwilligung erforderlich. Sie können ihn jederzeit löschen, indem Sie die Websitedaten in Ihrem Browser entfernen.',
      ],
    },
    {
      id: 'schriften',
      heading: 'Schriften und eingebettete Inhalte',
      body: [
        'Alle Schriftarten, Bilder und Skripte werden vom selben Server geladen wie die Seite. Es findet kein Abruf von Google Fonts, keine Einbindung von Videos, Karten oder sozialen Netzwerken und keine Verbindung zu einem Content Delivery Network Dritter statt. Eine Content-Security-Policy unterbindet solche Verbindungen zusätzlich technisch.',
      ],
    },
    {
      id: 'links',
      heading: 'Links zu anderen Anbietern',
      body: [
        'Die Seite enthält Schaltflächen zum Teilen von Inhalten bei X, WhatsApp und LinkedIn sowie einen Link zu einem YouTube-Kanal. Das sind gewöhnliche Verweise, keine eingebetteten Bausteine: Solange Sie sie nicht anklicken, wird nichts an diese Anbieter übertragen. Die Links sind so gesetzt, dass die zuvor besuchte Adresse nicht mitgesendet wird.',
        'Klicken Sie einen dieser Links an, verlassen Sie diese Seite. Dabei wird die Adresse der geteilten Seite an den jeweiligen Dienst übermittelt, weil sie Bestandteil des Links ist; die zuvor besuchte Adresse wird dagegen unterdrückt. Ab dann gelten die Datenschutzbestimmungen des jeweiligen Anbieters, auf dessen Verarbeitung wir keinen Einfluss haben.',
      ],
    },
    {
      id: 'inhalte',
      heading: 'Veröffentlichte Inhalte',
      body: [
        'Veröffentlicht werden Vorhersagen von Sprachmodellen zu öffentlichen Ereignissen sowie deren Auswertung. Diese Inhalte beziehen sich auf Ereignisse und Modelle, nicht auf Besucherinnen und Besucher dieser Seite. Personenbezogene Daten von Nutzenden werden dabei nicht verarbeitet.',
      ],
    },
    {
      id: 'rechte',
      heading: 'Ihre Rechte',
      body: [
        'Sie haben das Recht auf Auskunft über die zu Ihrer Person verarbeiteten Daten, auf Berichtigung, auf Löschung, auf Einschränkung der Verarbeitung, auf Datenübertragbarkeit sowie das Recht, der Verarbeitung zu widersprechen. Wenden Sie sich dafür an die im Impressum genannte Adresse.',
        'Unabhängig davon können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren, insbesondere bei der Behörde Ihres gewöhnlichen Aufenthaltsorts.',
      ],
    },
  ],

  en: [
    {
      id: 'kurz',
      heading: 'The short version',
      body: [
        'This site sets no cookies, embeds no analytics or advertising services, and loads nothing from third-party servers. There are no user accounts, no forms and no newsletter. We collect no personal data for evaluation.',
        'What unavoidably occurs is the access data every web server processes while delivering a page. That is what this notice is mainly about.',
      ],
    },
    {
      id: 'verantwortlich',
      heading: 'Controller',
      body: [
        'The controller for data processing on this site is the operator named in the imprint. For any question about data protection, an informal message to the address given there is enough.',
      ],
    },
    {
      id: 'server',
      heading: 'Access data',
      body: [
        'When you open a page, your browser transmits technically necessary data to the server. It is stored in server logs:',
      ],
      list: [
        'IP address of the requesting device',
        'date and time of the request',
        'requested address and amount of data transferred',
        'browser type and operating system',
        'the previously visited page, where your browser sends it',
      ],
    },
    {
      id: 'zweck',
      heading: 'Purpose and legal basis',
      body: [
        'This data is required to deliver the site, keep it stable and defend against attacks. The legal basis is the legitimate interest in a secure and functioning service under Article 6(1)(f) GDPR.',
        'The logs are deleted as soon as they are no longer needed for those purposes; the retention period follows the hosting provider’s settings. Anything is kept longer only where a specific security incident has to be investigated, and only until that investigation is finished.',
        'This data is not combined with other sources. There is no analysis of usage behaviour, no profiling and no automated decision-making.',
      ],
    },
    {
      id: 'hosting',
      heading: 'Hosting',
      body: [
        'The site is hosted by Vercel Inc. The provider processes the access data described above on our behalf under a data processing agreement pursuant to Article 28 GDPR. Delivery runs through servers in the European Union.',
        'Where data is transferred to the United States, the transfer relies on the European Commission’s adequacy decision for the EU-US Data Privacy Framework and, in addition, on the European Commission’s standard contractual clauses under Article 46(2)(c) GDPR.',
      ],
    },
    {
      id: 'speicher',
      heading: 'Storage in your browser',
      body: [
        'The site stores exactly one value locally in your browser: under the key “arena-theme”, whether you chose the light or the dark appearance. It is written only when you operate the switch yourself, contains nothing personal, and is never transmitted to a server.',
        'Because it serves solely to preserve a setting you explicitly requested, no consent is required for it. You can delete it at any time by clearing site data in your browser.',
      ],
    },
    {
      id: 'schriften',
      heading: 'Fonts and embedded content',
      body: [
        'All fonts, images and scripts are served from the same origin as the page. There is no Google Fonts request, no embedded video, map or social network, and no connection to a third-party content delivery network. A Content Security Policy additionally blocks such connections at the technical level.',
      ],
    },
    {
      id: 'links',
      heading: 'Links to other providers',
      body: [
        'The site offers buttons for sharing content on X, WhatsApp and LinkedIn, and a link to a YouTube channel. These are ordinary links, not embedded widgets: nothing is transmitted to those providers unless you click. The links are set so that the previously visited address is not passed on.',
        'Once you follow such a link you leave this site. The address of the shared page is passed to that service, because it forms part of the link; the previously visited address is suppressed. From then on the privacy policy of the respective provider applies, over whose processing we have no influence.',
      ],
    },
    {
      id: 'inhalte',
      heading: 'Published content',
      body: [
        'What is published are predictions made by language models about public events, and their evaluation. This content concerns events and models, not visitors to this site. No personal data of users is processed in it.',
      ],
    },
    {
      id: 'rechte',
      heading: 'Your rights',
      body: [
        'You have the right of access to data concerning you, and the rights to rectification, erasure, restriction of processing, data portability, and to object to processing. Please use the address given in the imprint.',
        'Independently of that, you may lodge a complaint with a data protection supervisory authority, in particular the one where you habitually reside.',
      ],
    },
  ],

  es: [
    {
      id: 'kurz',
      heading: 'Lo esencial',
      body: [
        'Este sitio no usa cookies, no integra servicios de análisis ni de publicidad y no carga contenido desde servidores ajenos. No hay cuentas de usuario, ni formularios, ni boletín. No recogemos datos personales para evaluarlos.',
        'Lo que sí se produce inevitablemente son los datos de acceso que cualquier servidor web procesa al entregar una página. De eso trata principalmente este aviso.',
      ],
    },
    {
      id: 'verantwortlich',
      heading: 'Responsable',
      body: [
        'El responsable del tratamiento en este sitio es el titular indicado en el aviso legal. Para cualquier consulta sobre protección de datos basta un mensaje a la dirección allí indicada.',
      ],
    },
    {
      id: 'server',
      heading: 'Datos de acceso',
      body: [
        'Al abrir una página, su navegador transmite al servidor datos técnicamente necesarios, que quedan en los registros del servidor:',
      ],
      list: [
        'dirección IP del dispositivo solicitante',
        'fecha y hora de la solicitud',
        'dirección solicitada y volumen de datos transferido',
        'tipo de navegador y sistema operativo',
        'la página visitada anteriormente, si su navegador la envía',
      ],
    },
    {
      id: 'zweck',
      heading: 'Finalidad y base jurídica',
      body: [
        'Estos datos son necesarios para entregar el sitio, mantener su estabilidad y defenderlo frente a ataques. La base jurídica es el interés legítimo en un servicio seguro y funcional, conforme al artículo 6.1.f del RGPD.',
        'Los registros se borran en cuanto dejan de ser necesarios para esos fines; el plazo de conservación se rige por la configuración del proveedor de alojamiento. Solo se conserva más tiempo lo que haga falta para esclarecer un incidente de seguridad concreto, y únicamente hasta que ese esclarecimiento concluya.',
        'Estos datos no se combinan con otras fuentes. No hay análisis del comportamiento de uso, ni elaboración de perfiles, ni decisiones automatizadas.',
      ],
    },
    {
      id: 'hosting',
      heading: 'Alojamiento',
      body: [
        'El sitio está alojado en Vercel Inc. El proveedor trata los datos de acceso descritos por cuenta nuestra, en virtud de un contrato de encargo del tratamiento conforme al artículo 28 del RGPD. La entrega se realiza a través de servidores situados en la Unión Europea.',
        'En la medida en que haya transferencias a Estados Unidos, estas se amparan en la decisión de adecuación de la Comisión Europea relativa al EU-US Data Privacy Framework y, complementariamente, en las cláusulas contractuales tipo de la Comisión Europea conforme al artículo 46.2.c del RGPD.',
      ],
    },
    {
      id: 'speicher',
      heading: 'Almacenamiento en su navegador',
      body: [
        'El sitio guarda localmente un único valor en su navegador: bajo la clave «arena-theme», si eligió la apariencia clara u oscura. Solo se escribe cuando usted acciona el interruptor, no contiene ningún dato personal y nunca se transmite a un servidor.',
        'Dado que sirve exclusivamente para conservar un ajuste solicitado expresamente por usted, no requiere consentimiento. Puede borrarlo en cualquier momento eliminando los datos del sitio en su navegador.',
      ],
    },
    {
      id: 'schriften',
      heading: 'Tipografías y contenido incrustado',
      body: [
        'Todas las tipografías, imágenes y scripts se sirven desde el mismo origen que la página. No hay peticiones a Google Fonts, ni vídeos, mapas o redes sociales incrustados, ni conexión a una red de distribución de contenidos de terceros. Además, una Content Security Policy bloquea técnicamente ese tipo de conexiones.',
      ],
    },
    {
      id: 'links',
      heading: 'Enlaces a otros proveedores',
      body: [
        'El sitio ofrece botones para compartir en X, WhatsApp y LinkedIn, y un enlace a un canal de YouTube. Son enlaces corrientes, no widgets incrustados: mientras no haga clic, no se transmite nada a esos proveedores. Los enlaces están configurados para no enviar la dirección visitada previamente.',
        'Al seguir uno de esos enlaces abandona este sitio. La dirección de la página compartida se transmite a ese servicio, porque forma parte del enlace; la dirección visitada previamente, en cambio, se suprime. A partir de ese momento se aplica la política de privacidad del proveedor correspondiente, sobre cuyo tratamiento no tenemos influencia.',
      ],
    },
    {
      id: 'inhalte',
      heading: 'Contenidos publicados',
      body: [
        'Se publican predicciones de modelos de lenguaje sobre acontecimientos públicos y su evaluación. Esos contenidos se refieren a acontecimientos y modelos, no a quienes visitan este sitio. En ellos no se tratan datos personales de las personas usuarias.',
      ],
    },
    {
      id: 'rechte',
      heading: 'Sus derechos',
      body: [
        'Tiene derecho a acceder a los datos que le conciernen, así como a su rectificación, supresión, limitación del tratamiento, portabilidad y a oponerse al tratamiento. Diríjase a la dirección indicada en el aviso legal.',
        'Con independencia de ello, puede presentar una reclamación ante una autoridad de control de protección de datos, en particular la de su lugar de residencia habitual.',
      ],
    },
  ],
};

export function privacySections(locale: Locale): LegalSection[] {
  return PRIVACY[locale];
}
