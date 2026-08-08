// ============================================================
// NOTES ANNEXES (NOTE 1 à NOTE 39) — moteur générique
// Réutilise le même mapping SYSCOHADA (compteRefMap / LIASSE_DATA) et les mêmes
// primitives que ACTIF / PASSIF / RESULTAT / TFT ci-dessus : aucune nouvelle table
// de correspondance comptes -> rubriques n'est créée, tout part de LIASSE_DATA et
// de la balance saisie (balanceData.n / balanceData.n1).
// ============================================================

// ---------- Libellés officiels des comptes (feuille PCG du classeur DGI) ----------
var LIASSE_PCG_LABELS = {"1011":"Capital souscrit, non appelé","1012":"Capital souscrit, appelé, non versé","1013":"Capital souscrit, appelé, versé, non amorti","1014":"Capital souscrit, appelé, versé, amorti","1018":"Capital souscrit soumis à des conditions particulières","1021":"Dotation initiale","1022":"Dotations complémentaires","1028":"Autres dotations","1030":"Capital personnel","1041":"Apports temporaires","1042":"Opérations courantes","1043":"Rémunérations, impôts et autres charges personnelles","1047":"Prélèvements d’autoconsommation","1048":"Autres prélèvements","1051":"Primes d’émission","1052":"Primes d’apport","1053":"Primes de fusion","1054":"Primes de conversion","1058":"Autres primes","1061":"Ecarts de réévaluation légale","1062":"Ecarts de réévaluation libre","1090":"Actionnaires, capital souscrit,  non appelé","1110":"Réserve légale","1120":"Réserves statutaires ou contractuel","1131":"Réserves de plus-values nettes à long terme","1132":"Réserves d'attributions gratuite d'actions au personnel salarié et aux dirigeants","1133":"Réserves consécutives à l’octroi de subventions d'investissements","1134":"Réserves des valeurs mobilières donnant accès au capital","1138":"Autres réserves réglementées","1181":"Réserves facultatives","1188":"Réserves diverses","1210":"Report à nouveau créditeur","1291":"Perte nette à reporter","1292":"Perte - Amortissements réputés différés","1411":"État","1412":"Régions","1413":"Départements","1414":"Communes et collectivités publiques décentralisées","1415":"Entreprises publiques ou mixtes","1416":"Entreprises et organismes privés","1417":"Organismes internationaux","1418":"Autres","1480":"Autres subventions d'investissement","1510":"Amortissements dérogatoires","1520":"Plus-values de cession à réinvestir","1531":"Fonds National","1532":"Prélèvement pour le Budget","1541":"Provision spéciale de réévaluation sur immobilisations corporelles","1548":"Provision spéciale de réévaluation sur immobilisations financières","1551":"Reconstitution des gisements miniers et pétroliers","1561":"Hausse de prix","1562":"Fluctuation des cours","1570":"Provisions pour investissement","1580":"Autres provisions et fonds réglementés","1611":"Emprunts obligataires ordinaires","1612":"Emprunts obligataires convertibles en actions","1613":"Emprunts obligataires remboursables en actions","1618":"Autres emprunts obligataires","1620":"Emprunts et dettes auprès des établissements de crédit","1630":"Avances reçues de l’État","1640":"Avances reçues et comptes courants bloqués","1651":"Dépôts reçus","1652":"Cautionnements reçus","1661":"sur emprunts obligataires","1662":"sur emprunts et dettes auprès des établissements de crédit","1663":"sur avances reçues de l’État","1664":"sur avances reçues et comptes courants bloqués","1665":"sur dépôts et cautionnements reçus","1667":"sur avances assorties de conditions particulières","1668":"sur autres emprunts et dettes","1671":"Avances bloquées pour augmentation du capital","1672":"Avances conditionnées par l’État","1673":"Avances conditionnées par les autres organismes africains","1674":"Avances conditionnées par les organismes internationaux","1681":"Rentes viagères capitalisées","1682":"Billets de fonds","1683":"Dettes consécutives à des titres empruntés","1684":"Emprunts participatifs","1685":"Participation des travailleurs aux bénéfices","1686":"Autres emprunts et dettes contractés auprès des autres tiers","1720":"Dettes de location-acquisition/ crédit - bail immobilier","1730":"Dettes de location-acquisition/ crédit - bail mobilier","1762":"Intérêts courus dettes de location-acquisition/Crédit-bail immobilier","1763":"Intérêts courus dettes de location-acquisition/location-mobilier","1764":"Intérêts courus dettes de location-acquisition/Crédit-bail vente","1768":"Intérêts courus autres dettes de location-acquisition","1740":"Dette de location acquisition/ Location vente","1811":"Dettes liées à des participations (groupe)","1812":"Dettes liées à des participations (hors groupe)","1820":"Dettes liées à des sociétés en participation","1830":"Intérêts courus sur dettes liées à des participations","1840":"Comptes permanents bloqués des établissements et succursales","1850":"Comptes permanents non bloqués des établissements et succursales","1860":"Comptes de liaison charges","1870":"Comptes de liaison produits","1880":"Comptes de liaison des sociétés en participations","1910":"Provisions pour litiges","1920":"Provisions pour garanties données aux clients","1930":"Provisions pour pertes sur marchés à achèvement futur","1940":"Provisions pour pertes de change","1950":"Provisions pour impôts","1961":"Provisions pour pensions et obligations similaires-engagement de retraite","1962":"Actif du régime de retraite","1970":"Provisions pour restructuration","1981":"Provisions pour amendes et pénalités","1983":"Provisions de propre assureur","1984":"Provisions pour démantèlement et remise en état","1985":"Provisions pour droits à réduction ou avantage en nature (Chèques cadeaux, cartes de fidélité…)","1988":"Provisions pour divers risques et charges","2110":"Frais de développemt","2121":"Brevets","2122":"Licences","2123":"Concessions de services public","2128":"Autres concessions et droits similaires","2131":"Logiciels","2132":"Sites internet","2140":"Marques","2150":"Fonds commercial","2160":"Droit au bail","2170":"Investissements de création","2181":"Frais de prospection et d'évaluation de ressources minérales","2182":"Coûts d'obtention du contrat","2183":"Fichier clients, notices, titres de journaux et magazines","2184":"Coûts des franchises","2188":"Divers droits et valeurs incorporels","2191":"Frais de développemt","2193":"Logiciels et internet","2198":"Autres droits et valeurs incorporels","2211":"Terrains d’exploitation agricole","2212":"Terrains d’exploitation forestière","2218":"Autres terrains","2221":"Terrains à bâtir","2228":"Autres terrains nus","2231":"pour bâtiments industriels et agricôles","2232":"pour bâtiments administratifs et commerciaux","2234":"pour bâtiments affectés aux autres opérations professionnelles","2235":"pour bâtiments affectés aux autres opérations non professionnelles","2238":"Autres terrains bâtis","2241":"Plantation d’arbres et d’arbustes","2245":"Améliorations du fonds","2248":"Autres travaux","2251":"Carrières","2261":"Parkings","2270":"Terrains mis en concession","2281":"Terrains-immeubles de placement","2285":"Terrains des logements affectés au personnel","2286":"Terrains de location-acquisition","2288":"Divers terrains","2291":"Terrains agricoles et forestiers","2292":"Terrains nus","2295":"Terrains de carrières - tréfonds","2298":"Autres terrains","2311":"Bâtiments industriels","2312":"Bâtiments agricoles","2313":"Bâtiments administratifs et commerciaux","2314":"Bâtiments affectés au logement du personnel","2315":"Bâtiments-immeuble de placement","2316":"Bâtiments de locations acquisitions","2321":"Bâtiments industriels","2322":"Bâtiments agricoles","2323":"Bâtiments administratifs et commerciaux","2324":"Bâtiments affectés au logement du personnel","2325":"Bâtiments-immeuble de placement","2326":"Bâtiments de location - acquisition","2331":"Voies de terre","2332":"Voies de fer","2333":"Voies d’eau","2334":"Barrages, Digues","2335":"Pistes d’aérodrome","2338":"Autres ouvrages d’infrastructures","2341":"Installations complexes spécialisée sur sol propre","2342":"Installations complexes spécialisée sur sol d'autrui","2343":"Installations à caractère spécifique sur sol propre","2344":"Installations à caractère spécifique sur sol d'autrui","2345":"Aménagements et agencements des bâtiments","2351":"Installations générales","2358":"Autres aménagements de bureaux","2370":"Bâtiments industriels, agricoles et commerciaux mis en concession","2380":"Autres installations et agencements","2391":"Bâtiments en cours","2392":"Installations en cours","2393":"Ouvrages d'infrastructures en cours","2394":"Aménagements, agencements et installations techniques en cours","2395":"Aménagements de bureaux en cours","2398":"Autres installations et agencements en cours","2411":"Matériel industriel","2412":"Outillage industriel","2413":"Matériel commercial","2414":"Outillage commercial","2416":"Matériel et outillage industriel et commercial de location-acquisition","2421":"Matériel agricole","2422":"Outillage agricole","2426":"Matériel et outillage agricole de location-acquisition","2430":"Matériel d’emballage récupérable et identifiable","2441":"Matériel de bureau","2442":"Matériel informatique","2443":"Matériel bureautique","2444":"Mobilier de bureau","2445":"Matériel et mobilier - immeubles de placement","2446":"Matériel et mobilier de location-acquisition","2447":"Matériel et mobilier des logements du personnel","2451":"Matériel automobile","2452":"Matériel ferroviaire","2453":"Matériel fluvial, lagunaire","2454":"Matériel naval","2455":"Matériel aérien","2456":"Matériel de transport de location-acquisition","2457":"Matériel hippomobile","2458":"Autres matériels de transport","2461":"Cheptel, animaux de trait","2462":"Cheptel, animaux reproducteurs","2463":"Animaux de garde","2465":"Plantations agricoles","2468":"Autres actifs biologiques","2471":"Agencements et aménagements du matériel","2472":"Agencements et aménagements des actifs biologiques","2478":"Autres agencements, aménagements du matériel et actifs biologiques","2481":"Collections et oeuvres d’art","2488":"Divers matériels et mobiliers","2491":"Matériel et outillage industriel et commercial","2492":"Matériel et outillage agricole","2493":"Matériel d’emballage récupérable et identifiable","2494":"Matériel et mobilier de bureau","2495":"Matériel de transport","2496":"Actifs biologiques","2497":"Agencements et aménagements du matériel et des actifs biologiques","2498":"Autres matériels et actifs biologiques en cours","2510":"Avances et acomptes versés sur immobilisations incoporelles","2520":"Avances et acomptes versés sur immobilisations coporelles","2610":"Titres de participation dans les entités sous contrôle exclusif","2620":"Titres de participation dans les entités sous contrôle conjoint","2630":"Titres de participation dans des entités conférents une influence notable","2650":"Participations dans des organismes professionnels","2660":"Parts dans des groupements d’intérêt économiques (G.I.E)","2680":"Autres titres de participation","2711":"Prêts participatifs","2712":"Prêts aux associés","2713":"Billets de fonds","2714":"Créances de location-financement","2715":"Titres prêtés","2718":"Autres prêts et créances","2721":"Prêts immobiliers","2722":"Prêts mobiliers et d’installation","2728":"Autres prêts au personnel","2731":"Retenues de garantie","2733":"Fonds réglementé","2734":"Créances sur le concédant","2738":"Autres créances sur l’État","2741":"Titres immobilisés de l’activité de portefeuille (T.I.A.P)","2742":"Titres participatifs","2743":"Certificats d’investissement","2744":"Parts de fonds commun de placement (F.C.P)","2745":"Obligations","2746":"Actions ou parts propres","2748":"Autres titres immobilisés","2751":"Dépôts pour loyers d’avance","2752":"Dépôts pour l’électricité","2753":"Dépôts pour l’eau","2754":"Dépôts pour le gaz","2755":"Dépôts pour le téléphone, le télex, la télécopie","2756":"Cautionnements sur marchés publics","2757":"Cautionnements sur autres opérations","2758":"Autres dépôts et cautionnements","2761":"Prêts et créances non commerciales","2762":"Prêts au personnel","2763":"Créances sur l’État","2764":"Titres immobilisés","2765":"Dépôts et cautionnements versés","2766":"Créances de location-financement","2767":"Créances rattachées à des participations","2768":"Immobilisations financières diverses","2771":"Créances rattachées à des participations (groupe)","2772":"Créances rattachées à des participations (hors groupe)","2773":"Créances rattachées à des sociétés en participation","2774":"Avances à des Groupements d’intérêt économiques (G.I.E)","2781":"Créances diverses groupe","2782":"Créances diverses hors groupe","2784":"Banques dépôts à terme","2785":"Or et métaux précieux [1]","2788":"Autres immobilisations financières","2811":"Amortissements des frais de développement","2812":"Amortissements des brevets, licences, concessions et droits similaires","2813":"Amortissements des logiciels et sites internet","2814":"Amortissements des marques","2815":"Amortissements du fonds commercial","2816":"Amortissements du droit au bail","2817":"Amortissements des investissements de création","2818":"Amortissements des autres droits et valeurs incorporels","2824":"Amortissements des travaux de mise en valeur des terrains","2831":"Amortissements des bâtiments ,agricols, administratifs et commerciaux sur sol propre","2832":"Amortissements des bâtiments ,agricols, administratifs et commerciaux sur sol d'autrui","2833":"Amortissements des ouvrages d’infrastructures","2834":"Amortissements des aménagements, agencements et installations techniques","2835":"Amortissements des aménagements de bureaux","2837":"Amortissements des bâtiments industriels, agricoles et commerciaux mis en concession","2838":"Amortissements des autres installations et agencements","2841":"Amortissements du matériel et outillage industriel et commercial","2842":"Amortissements du matériel et outillage agricole","2843":"Amortissements du matériel d’emballage récupérable et identifiable","2844":"Amortissements du matériel et mobilier","2845":"Amortissements du matériel de transport","2846":"Amortissements des actifs biologiques","2847":"Amortissements des agencements, améngements du matériel et des actifs biologiques","2848":"Amortissements des autres matériels","2911":"Dépréciations des frais de développement","2912":"Dépréciation des brevets, licences, concessions et droits similaires","2913":"Dépréciation des logiciels et sites internet","2914":"Dépréciation des marques","2915":"Dépréciation du fonds commercial","2916":"Dépréciation du droit au bail","2917":"Dépréciation des investissements de création","2918":"Dépréciation des autres droits et valeurs incorporels","2919":"Dépréciation des immobilisations incorporelles encours","2921":"Dépréciation des terrains agricoles et forestiers","2922":"Dépréciation des terrains nus","2923":"Dépréciation des terrains bâtis","2924":"Dépréciation des travaux de mis en valeur des terrains","2925":"Dépréciation des terrains de carrières-tréfonds","2926":"Dépréciation des terrains aménagés","2927":"Dépréciation des terrains mis en concession","2928":"Dépréciation des autres terrains","2929":"Dépréciation des aménagements de terrains en cours","2931":"Dépréciation des bâtiments ,agricols, administratifs et commerciaux sur sol propre","2932":"Dépréciation des bâtiments ,agricols, administratifs et commerciaux sur sol d'autrui sur sol d'autrui","2933":"Dépréciation des ouvrages d'infrastructures","2934":"Dépréciation des aménagements, agencements et installations techniques","2935":"Dépréciation des aménagements de bureaux","2937":"Dépréciation des bâtiments industriels, agricoles et commerciaux mis en concession","2938":"Dépréciation des autres installations et agencements","2939":"Dépréciation Bâtiments et instatllations en cours","2941":"Dépréciation du matériel et outillage industriel et commercial","2942":"Dépréciation du matériel et outillage agricole","2943":"Dépréciation du matériel d'emballage récupérable et identifiable","2944":"Dépréciation du matériel et mobilier","2945":"Dépréciation du matériel de transport","2946":"Dépréciation des actifs biologiques","2947":"Dépréciation des agencements, aménagements du matériel et des actifs biologiques","2948":"Dépréciation des autres matériels","2949":"Dépréciation Matériel  en cours","2951":"Dépréciation des avances et acomptes versés sur immobilisations incorporelles","2952":"Dépréciation des avances et acomptes versés sur immobilisations corporelles","2961":"Dépréciation des titres de participation dans les entités sous contrôle exclusif","2962":"Dépréciation des titres de participation dans les entités sous contrôle conjoint","2963":"Dépréciation des titres de participation dans des entités conférant une influence notable","2965":"Dépréciation des participations dans des organismes professionnels","2966":"Dépréciation des parts dans des GIE","2968":"Dépréciation des autres titres de participation","2971":"Dépréciation des prêts et créances","2972":"Dépréciation des prêts au personnel","2973":"Dépréciation des créances sur l'Etat","2974":"Dépréciation des titres immobilisés","2975":"Dépréciation des dépôts et cautionnements versés","2977":"Dépréciation des créances rattachées à des participations et avances à des GIE","2978":"Dépréciation des créances financières diverses","3111":"Marchandises A1","3112":"Marchandises A2","3121":"Marchandises B1","3122":"Marchandises B2","3131":"Actifs biologiques/Animaux","3132":"Actifs biologiques/Végétaux","3180":"Marchandises hors activités ordinaires (H.A.O)","3210":"Matières A","3220":"Matières B","3230":"Fournitures (A, B)","3310":"Matières consommables","3320":"Fournitures d’atelier et d’usine","3330":"Fournitures de magasin","3340":"Fournitures de bureau","3351":"Emballages perdus","3352":"Emballages récupérables non identifiables","3353":"Emballages à usage mixte","3358":"Autres emballages","3380":"Autres matières","3411":"Produits en cours P1","3412":"Produits en cours P2","3421":"Travaux en cours T1","3422":"Travaux en cours T2","3431":"Produits intermédiaires A en cours","3432":"Produits intermédiaires B en cours","3441":"Produits résiduels A en cours","3442":"Produits résiduels B en cours","3451":"Actifs biologiques/Animaux en cours","3452":"Actifs biologiques/Végétaux en cours","3511":"Études en cours E1","3512":"Études en cours E2","3521":"Prestations de services S1","3522":"Prestations de services S2","3610":"Produits finis A","3620":"Produits finis B","3631":"Animaux","3632":"Végétaux","3638":"Autres stocks (activités annexes)","3711":"Produits intermédiaires A","3712":"Produits intermédiaires B","3721":"Déchets","3722":"Rebuts","3723":"Matières de Récupération","3731":"Actifs biologiques Animaux","3732":"Actifs biologiques Végétaux","3738":"Actifs biologiques Autres stocks (activités annexes)","3810":"Marchandises en cours de route","3820":"Matières premières et fournitures liées en cours de route","3830":"Autres approvisionnements en cours de route","3860":"Produits finis en cours de route","3871":"Stock en consignation","3872":"Stock en dépôt","3880":"Stock provenant d’immobilisations mises hors service ou au rebut","3910":"Dépréciations des stocks de marchandises","3920":"Dépréciations des stocks de matières premières et fournitures liées","3930":"Dépréciations des stocks d’autres approvisionnements","3940":"Dépréciations des productions en cours","3950":"Dépréciations des services en cours","3960":"Dépréciations des stocks de produits finis","3970":"Dépréciations des stocks de produits intermédiaires et résiduels","3980":"Dépréciations des stocks en cours de route, en consignation ou en dépôt","4011":"Fournisseurs","4012":"Fournisseurs Groupe","4013":"Fournisseurs sous-traitants","4016":"Fournisseurs, réserves de propriété","4017":"Fournisseurs, retenues de garantie","4021":"Fournisseurs, Effets à payer","4022":"Fournisseurs - Groupe, Effets à payer","4023":"Fournisseurs sous-traitants, Effets à payer","4041":"Fournisseurs dettes en compte.Immobilisations incoporelles","4042":"Fournisseurs dettes en compte.Immobilisations coporelles","4046":"Fournisseurs effets à payer, immobilisations incporelles","4047":"Fournisseurs effets à payer, immobilisations cporelles","4081":"Fournisseurs","4082":"Fournisseurs - Groupe","4083":"Fournisseurs sous-traitants","4086":"Fournisseurs, intérêts courus","4091":"Fournisseurs avances et acomptes versés","4092":"Fournisseurs - Groupe avances et acomptes versés","4093":"Fournisseurs sous-traitants avances et acompets versés","4094":"Fournisseurs créances pour emballages et matériels à rendre","4098":"Rabais, Remises, Ristournes et autres avoirs à obtenir","4111":"Clients","4112":"Clients-Groupe","4114":"Clients, Etat et collectivités publiques","4115":"Clients, organismes internationaux","4116":"Clients, réserve de propriété","4117":"Clients, retenues de garantie","4118":"Clients, dégrèvements de Taxes sur la Valeur Ajoutée (TVA)","4121":"Clients, Effets à recevoir","4122":"Clients - Groupe, Effets à recevoir","4124":"État et Collectivités publiques, Effets à recevoir","4125":"Organismes Internationaux, Effets à recevoir","4131":"Clients, chèques impayés","4132":"Clients, effets impayés","4133":"Clients, cartes de crédit impayées","4138":"Clients, autres valeurs impayées","4141":"Créances en compte, immobilisations incoporelles","4142":"Créances en compte, immobilisations coporelles","4146":"Effets à recevoir, immobilisations incorporelles","4147":"Effets à recevoir, immobilisations corporelles","4150":"Clients, effets escomptés non échus","4161":"Créances litigieuses","4162":"Créances douteuses","4181":"Clients, factures à établir","4186":"Clients, intérêts courus","4191":"Clients, avances et acomptes reçus","4192":"Clients - Groupe, avances et acomptes reçus","4194":"Clients, dettes pour emballages et matériels consignés","4198":"Client rabais, remises, ristournes et autres avoirs accordés","4211":"Personnel, avances","4212":"Personnel, acomptes","4213":"Frais avancés et fournitures au personnel","4220":"Personnel, rémunérations dues","4231":"Personnel, oppositions","4232":"Personnel, saisies-arrêts","4233":"Personnel, avis à tiers détenteur","4241":"Assistance médicale","4242":"Allocations familiales","4245":"Organismes sociaux rattachés à l’entité","4248":"Autres oeuvres sociales internes","4251":"Délégués du personnel","4252":"Syndicats et comités d’entreprise, d'établissement","4258":"Autres représentants du personnel","4261":"Personnel, participation aux bénéfices","4264":"Participation au capital","4270":"Personnel - dépôts","4281":"Personnel, Dettes provisionnées pour congés à payer","4286":"Personnel, Autres charges à payer","4287":"Personnel, Produits à recevoir","4311":"Prestations familiales","4312":"Accidents de travail","4313":"Caisse de retraite obligatoire","4314":"Caisse de retraite facultative","4318":"Autres cotisations sociales","4320":"Caisses de retraite complémentaire","4331":"Mutuelle","4332":"Assurances Retraite","4333":"Assurances et organismes de santé","4381":"Charges sociales sur gratifications à payer","4382":"Charges sociales sur congés à payer","4386":"Autres charges à payer","4387":"Produits à recevoir","4410":"Etat, impôt sur les bénéfices","4421":"Impôts et taxes d’État","4422":"Impôts et taxes pour les collectivités publiques","4423":"Impôts et taxes recouvrables sur des obligations","4424":"Impôts et taxes recouvrables sur des associés","4426":"Droits de douane","4428":"Autres impôts et taxes","4431":"TVA facturée sur ventes","4432":"TVA facturée sur prestations de services","4433":"TVA facturée sur travaux","4434":"TVA facturé sur production livrée à soi-même","4435":"TVA sur factures à établir","4441":"État, TVA due","4445":"Etat, dégrèvement TVA","4449":"État, crédit de TVA à reporter","4451":"TVA récupérable sur immobilisations","4452":"TVA récupérable sur achats","4453":"TVA récupérable sur transport","4454":"TVA récupérable sur services extérieurs et autres charges","4455":"TVA récupérable sur factures non parvenus","4456":"TVA transférée par d’autres entitées","4460":"État, autres taxes sur le chiffre d'affaires","4471":"Impôt Général sur le revenu","4472":"Impôts sur salaires","4473":"Contribution nationale","4474":"Contribution nationale de solidarité","4478":"Autres impôts et contributions","4486":"Etat, Charges à payer","4487":"Etat, Produits à recevoir","4491":"État, obligations cautionnées","4492":"État, avances et acomptes versés sur impôts","4493":"État, fonds de dotation à recevoir","4494":"État, subventions d'investiments à recevoir","4495":"État, subventions d’exploitation à recevoir","4496":"État, subventions d’équilibre à recevoir","4497":"Etats, avances sur subventions","4499":"État, fonds réglementé provisionné","4510":"Opérations avec les organismes africains","4520":"Opérations avec les autres organismes internationaux","4581":"Organismes internationaux, fonds de dotation à recevoir","4582":"Organismes internationaux, subventitions à recevoir","4611":"Apporteurs, apports en nature","4612":"Apporteurs, apports en numéraire","4613":"Apporteurs, capital souscrit appelé, non versé","4614":"Apporteurs, compte d'apports, opérations de restructurations (fusion…)","4615":"Apporteurs, versements reçus sur augmentation de capital","4616":"Apporteurs, versements anticipés","4617":"Apporteurs défaillants","4618":"Apporteurs, titres à échanger","4619":"Apporteurs, capital à rembourser","4621":"Associé, comptes courant Principal","4626":"Associé, comptes courant Intérêts courus","4631":"Associé, Opérations courantes","4636":"Associé, opérations courantes Intérêts courus","4650":"Associés, dividendes à payer","4660":"Groupe, comptes courants","4670":"Apporteurs, restant dû sur capital appelé","4690":"Entité, dividendes à recevoir","4711":"Débiteurs divers","4712":"Créditeurs divers","4713":"Obligataires","4715":"Rémunérations d'administrateurs non associés","4716":"Compte d'affacturage et de titrisation","4717":"Débiteurs divers-retenues de garantie","4718":"Apport, compte de fusion et opérations assimilés","4719":"Bons de sosucription d'actions et d'obligations","4721":"Créances sur cessions de titres de placement","4726":"Versements restant à effectuer sur titres de placement non libérés","4731":"Intermédiaires opérations faites pour compte de tiers, Mandants","4732":"Intermédiaires opérations faites pour compte de tiers, Mandataires","4733":"Intermédiaires opérations faites pour compte de tiers, Commettants","4734":"Intermédiaires opérations faites pour compte de tiers, Commissionnaires","4739":"Etat, collectivités publiques, fonds global d'allocation","4746":"Compte de répartition périodique des charges","4747":"Compte de répartition périodique des produits","4751":"Compte transitoire, Compte-actif","4752":"Compte transitoire, Compte-passif","4760":"Charges constatées d'avance","4770":"Produits constatés d'avance","4781":"Diminution des créances d'exploitation et HAO","4782":"Diminution des créances financières","4783":"Augmentations des dettes d'exploitations HAO","4784":"Augmentation des dettes financières","4786":"Différences d'évaluation sur instruments de trésorerie","4788":"Différences compensées par couverture de change","4791":"Augmentation des créances d'exploitations HAO","4792":"Augmentations des créances financières","4793":"Diminution des dettes d'exploitations HAO","4794":"Diminution des dettes financières","4797":"Différences d'évaluation sur instruments de trésorerie","4798":"Différences compensées par couverture de change","4811":"Immobilisations incorporelles","4812":"Immobilisations corporelles","4813":"Versements restant à effectuer sur titres de participations et titres immobilisés non libérés","4816":"Réserves de propriété","4817":"Réserves de garantie","4818":"Factures non parvenues","4821":"Immobilisations incorporelles","4822":"Immobilisations corporelles","4840":"Autres dettes hors activités ordinaires (HAO)","4851":"Créances sur cession HAO, d'Immobilisations incoporelles","4852":"Créances sur cession HAO, Immobilisations coporelles","4853":"Créances sur cession HAO, Effets à recevoir, immobilisations incorporelles","4854":"Créances sur cession HAO,Effets à recevoir, immobilisations corporelles","4855":"Créances sur cession HAO, Effets escomptés non échus","4856":"Créances sur cession HAO, Immobilisations financières","4857":"Créances sur cession HAO, Retenues de garantie","4858":"Créances sur cession HAO, Factures à établir","4880":"Autres créances hors activités ordinaires (HAO)","4900":"Dépréciations des comptes fournisseurs","4911":"Dépreciation de compte client, Créances litigieuses","4912":"Dépreciation de compte client, Créances douteuses","4920":"Dépréciations des comptes personnel","4930":"Dépréciations des comptes organismes sociaux","4940":"Dépréciations des comptes Etat et collectivités publiques","4950":"Dépréciations des comptes organismes internationaux","4962":"Associés, comptes courants","4963":"Associés, opérations faites en commun et GIE","4966":"Groupe, comptes courants","4970":"Dépréciations des comptes débiteurs divers","4985":"Dépreciation, Créances sur cessions d’immobilisations","4986":"Dépreciation, Créances sur cessions de titres de placement","4988":"Dépreciation, Autres créances HAO","4991":"Provision pour risque à court terme sur opérations d’exploitation","4998":"Provision pour risque à court terme sur opérations HAO","5011":"Titres du Trésor à court terme","5012":"Titres d’organismes financiers","5013":"Bons de caisse à court terme","5016":"Frais d'acquisition des titres de Trésor et bons de caisse","5021":"Actions ou parts propres","5022":"Actions cotées","5023":"Actions non cotées","5024":"Actions démembrées (certificats d’investissement; droit de vote)","5025":"Autres actions","5026":"Frais d'acquisition des actions","5031":"Obligations émises par l'entité et rachetées par elle","5032":"Obligations cotées","5033":"Obligations non cotées","5035":"Autres obligations","5036":"Frais d'acquisition des obligations","5042":"Bons de souscription d’actions","5043":"Bons de souscription d’obligations","5050":"Titres négociables hors région","5061":"Titres du Trésor et bons de caisse à court terme","5062":"Actions","5063":"Obligations","5080":"Autres titres de placement et creances assimilées","5110":"Effets à encaisser","5120":"Effets à l’encaissement","5130":"Chèques à encaisser","5140":"Chèques à l’encaissement","5150":"Cartes de crédit à encaisser","5181":"Warrants","5182":"Billets de fonds","5185":"Chèques de voyage","5186":"Coupons échus","5187":"Intérêts échus des obligations","5211":"Banques en monnaie nationale","5215":"Banques en devices","5220":"Banques autres États région","5230":"Banques autres États zone monétaire","5240":"Banques hors zone monétaire","5250":"Banques dépôt à terme","5261":"Banques, intérêts courus charges à payer","5265":"Banques, intérêts courus produits à recevoir","5310":"Chèques postaux","5320":"Trésor","5330":"Sociétés de gestion et d’intermédiation (S.G.I)","5360":"Établissements financiers, intérêts courus","5380":"autres organismes financiers","5410":"Options de taux d’intérêt","5420":"Options de taux de change","5430":"Options de taux boursiers","5440":"Instruments de marchés à terme","5450":"Avoirs d'or et autres métaux précieux","5510":"Monnaie électronique - carte de carburant","5520":"Monnaie électronique - telephone portable","5530":"Monnaie électronique - carte de peage","5540":"Porte-monnaie électronique","5580":"Autres instruments monnaies électroniques","5610":"Crédits de trésorerie","5640":"Escompte de crédits de campagne","5650":"Escompte de crédits ordinaires","5660":"Banques, crédits de trésorerie, interet courus","5711":"Caisse siège en monnaie nationale","5712":"Caisse siège en devises","5721":"Caisse succursales A, en monnaie nationale","5722":"Caisse succursales A, en devises","5731":"Caisse succursales B, en monnaie nationale","5732":"Caisse succursales B, en devises","5810":"Régies d’avance","5820":"Accréditifs","5850":"Virements de fonds","5880":"Autres virements internes","5900":"Dépréciation des titres de placement","5910":"Dépréciations des titres et valeurs a encaisser","5920":"Dépréciations des comptes banques","5930":"Dépréciations des comptes établissements financiers et assimilés","5940":"Dépréciations des comptes d’instruments de tresorerie","5990":"Provisions pour risque à court terme à caractère financier","6011":"Achats de marchandises dans l'Etat partie","6012":"Achats de marchandises hors Région (1)","6013":"Achats de marchandises aux entités du groupe dans la Région","6014":"Achats de marchandises aux entités du groupe hors Région","6015":"Frais sur achats de marchandises","6019":"Rabais, Remises et Ristournes obtenus (non ventilés)","6021":"Achats de matières premières dans l'Etat partie","6022":"Achats de matières premières hors Région (1)","6023":"Achats de matières premières aux entités du groupe dans la Région","6024":"Achats de matières premières aux entités du groupe hors Région","6025":"Frais sur achats de matières premières","6029":"Rabais, Remises et Ristournes obtenus (non ventilés)","6031":"Variations des stocks de marchandises","6032":"Variations des stocks de matières premières et fournitures liées","6033":"Variations des stocks d’autres approvisionnements","6041":"Matières consommables","6042":"Matières combustibles","6043":"Produits d’entretien","6044":"Fournitures d’atelier et d’usine","6045":"Frais sur achats stockés de matières et fournitures consommables","6046":"Fournitures de magasin","6047":"Fournitures de bureau","6049":"Rabais, Remises et Ristournes obtenus (non ventilés)","6051":"Fournitures non stockables - Eau","6052":"Fournitures non stockables - Électricité","6053":"Fournitures non stockables - Autres énergies","6054":"Fournitures d’entretien non stockables","6055":"Fournitures de bureau non stockable","6056":"Achats de petit matériel et outillage","6057":"Achats d’études et prestations de services","6058":"Achats de travaux, matériels et équipements","6059":"Rabais, Remises et Ristournes obtenus (non ventilés)","6081":"Emballages perdus","6082":"Emballages récupérables non identifiables","6083":"Emballages à usage mixte","6085":"Frais sur achats d'emballages","6089":"Rabais, Remises et Ristournes obtenus (non ventilés)","6120":"Transports sur ventes","6130":"Transports pour le compte de tiers","6140":"Transports du personnel","6160":"Transports de plis","6181":"Voyages et déplacements","6182":"Transports entre établissements ou chantiers","6183":"Transports administratifs","6190":"Rabais, Remises et Ristournes (non ventilés)","6210":"Sous-traitance générale","6221":"Locations de terrains","6222":"Locations de bâtiments","6223":"Locations de matériels et outillages","6224":"Malis sur emballages","6225":"Locations d’emballages","6226":"Fermages et loyers du foncier","6228":"Locations et charges locatives diverses","6232":"Crédit-bail immobilier","6233":"Crédit-bail mobilier","6234":"Location vente","6238":"Autres contrats de location-acquisition","6241":"Entretien et réparations des biens immobiliers","6242":"Entretien et réparations des biens mobiliers","6243":"Maintenance","6244":"Charges de dementèlement et remise en état","6248":"Autres entretiens et réparations","6251":"Assurances multirisques","6252":"Assurances matériel de transport","6253":"Assurances risques d’exploitation","6254":"Assurances responsabilité du producteur","6255":"Assurances insolvabilité clients","6257":"Assurances transport sur ventes","6258":"Autres primes d’assurances","6261":"Études et recherches","6265":"Documentation générale","6266":"Documentation technique","6271":"Annonces, insertions","6272":"Catalogues, imprimés publicitaires","6273":"Échantillons","6274":"Foires et expositions","6275":"Publications","6276":"Cadeaux à la clientèle","6277":"Frais de colloques, séminaires, conférences","6278":"Autres charges de publicité et relations publiques","6281":"Frais de téléphone","6282":"Frais de télex","6283":"Frais de télécopie","6288":"Autres frais de télécommunications","6311":"Frais sur titres (vente, garde)","6312":"Frais sur effets","6313":"Location de coffres","6314":"Commissions d'affacturage et de titrisation","6315":"Commissions sur cartes de crédit","6316":"Frais d’émission d’emprunts","6317":"Frais sur instruments monnaie électronique","6318":"Autres frais bancaires","6322":"Commissions et courtages sur ventes","6324":"Honoraires des professions règlementées","6325":"Frais d’actes et de contentieux","6326":"Rénumerations d'affacturage et de titrisation","6327":"Rénumerations des autres prestataires de services","6328":"Divers frais","6330":"Frais de formation du personnel","6342":"Redevances pour brevets, licences","6343":"Redevances pour logiciels","6344":"Redevances pour marques","6345":"Redevances pour sites internet","6346":"Redevances pour concessions, droits et valeurs similaires","6351":"Cotisations","6358":"Concours divers","6371":"Personnel intérimaire","6372":"Personnel détaché ou prêté à l’entité","6381":"Frais de recrutement du personnel","6382":"Frais de déménagement","6383":"Réceptions","6384":"Missions","6385":"Charges de coproprieté","6388":"Charges externes diverses","6411":"Impôts fonciers et taxes annexes","6412":"Patentes, licences et taxes annexes","6413":"Taxes sur appointements et salaires","6414":"Taxes d’apprentissage","6415":"Formation professionnelle continue","6418":"Autres impôts et taxes directs","6450":"Impôts et taxes indirects","6461":"Droits de mutation","6462":"Droits de timbre","6463":"Taxes sur les véhicules de société","6464":"Vignettes","6468":"Autres droits d'enregistrement","6471":"Pénalités d’assiette, impôts direct","6472":"Pénalités d’assiette, impôts indirects","6473":"Pénalités de recouvrement, impôts directs","6474":"Pénalités de recouvrement, impôts indirects","6478":"Autres pénalités et amendes fiscales","6480":"Autres impôts et taxes","6511":"Perte sur créances, Clients","6515":"Pertes sur créances, Autres débiteurs","6521":"Quote-part transférée de bénéfices (comptabilité du gerant)","6525":"Pertes imputées par transfert (comptabilité des associés non gerants)","6541":"Immobilisations incorporelles","6542":"Immobilisations corporelles","6560":"Perte de change sur creances et dettes commerciales","6570":"Penalités et amendes penales","6581":"Indemnités de fonction et autres renumerations d'administrateurs","6582":"Dons","6583":"Mécénat","6588":"Autres charges diverses","6591":"Charges pour dépréciation et provisions, sur risques à court terme","6593":"Charges pour dépréciation et provisions, sur stocks","6594":"Charges pour dépréciation et provisions, sur créances","6598":"Autres charges pour depreciations et provisions pour risques a court terme","6611":"Appointements salaires et commissions","6612":"Primes et gratifications","6613":"Congés payés","6614":"Indemnités de préavis, de licenciement et de recherche d'embauche","6615":"Indemnités de maladie versées aux travailleurs","6616":"Supplément familial","6617":"Avantages en nature","6618":"Autres rémunérations directes","6621":"Appointements salaires et commissions","6622":"Primes et gratifications","6623":"Congés payés","6624":"Indemnités de préavis, de licenciement et de recherche d'embauche","6625":"Indemnités de maladie versées aux travailleurs","6626":"Supplément familial","6627":"Avantages en nature","6628":"Autres rémunérations directes","6631":"Indemnités de logement","6632":"Indemnités de représentation","6633":"Indemnités d’expatriation","6634":"Indemnités de transport","6638":"Autres indemnités et avantages divers","6641":"Charges sociales sur rémunération du personnel national","6642":"Charges sociales sur rémunération du personnel non national","6661":"Rémunération du travail de l’exploitant","6662":"Charges sociales","6671":"Personnel intérimaire","6672":"Personnel détaché ou prêté à l’entité","6681":"Versements aux syndicats et comités d'entreprise, d'etablissement","6682":"Versements aux comités d’hygiène et de securité","6683":"Versements et contributions aux autres oeuvres sociales","6684":"Médecine du travail et pharmacie","6685":"Assurances et organismes de santé","6686":"Assurances retraite et fonds de pension","6687":"Majorations et penalités sociales","6688":"Charges sociales diverses","6711":"Emprunts obligataires","6712":"Emprunts auprès des établissements de credit","6713":"Dettes liées à des participations","6714":"Primes de remboursement des obligations","6722":"Intérêts dans loyers de location acquisition/crédit-bail immobilier","6723":"Intérêts dans loyers de location acquisition/credit-bail mobilier","6724":"Intérêts dans loyers de location acquisition/ location-vente","6728":"Interets dans loyers des autres locations acquisition","6730":"Escomptes accordés","6741":"Avances reçues et dépôts créditeurs","6742":"Comptes courants bloqués","6743":"Intérêts sur obligations cautionnées","6744":"Intérêts sur dettes commerciales","6745":"Intérêts bancaires et sur opérations de financement (escompte…)","6748":"Intérêts sur dettes diverses","6750":"Escomptes des effets de commerce","6760":"Pertes de change financières","6771":"Pertes sur cessions de titres de placement","6772":"Malis provenant d'attribution gratuite d'actions au personnel salarié et aux dirigeants","6781":"Pertes et charges sur rentes viagères","6782":"Pertes et charges sur opérations financières","6784":"Pertes et charges sur instruments de trésorerie","6791":"Charges pour dépreciations et provisions pour risque à court terme sur risques financiers","6795":"Charges pour dépreciations et provisions pour risque à court terme sur titres de placement","6798":"Autres charges pour depreciations et provisions pour risques a court terme financières","6812":"Dotations aux amortissements des immobilisations incorporelles","6813":"Dotations aux amortissements des immobilisations corporelles","6872":"Dotations aux amortissements des primes de remboursement des obligations","6878":"Autres dotations aux amortissements à caractère financier","6911":"Dotations aux provisions pour risques et charges","6913":"Dotations aux dépréciations des immobilisations incorporelles","6914":"Dotations aux dépréciations des immobilisations corporelles","6971":"Dotations aux provisions pour risques et charges","6972":"Dotations aux depreciations des immobilisations financières","7011":"Ventes de marchandises dans l'Etat partie","7012":"Ventes de marchandises hors Région","7013":"Ventes de marchandises aux entités du groupe dans la Région","7014":"Ventes de marchandises aux entités du groupe hors Région","7015":"Ventes de marchandises sur internet","7019":"Rabais, remises, ristournes accordés sur vente de marchandises (non ventilés)","7021":"Ventes de produits finis dans l'Etat partie","7022":"Ventes de produits finis hors Région","7023":"Ventes de produits finis aux entités du groupe dans la Région","7024":"Ventes de produits finis aux entités du groupe hors Région","7025":"Ventes de produits finis sur internet","7029":"Rabais, remises, ristournes accordés sur vente de produits finis (non ventilés)","7031":"Ventes de produits intermédiaires dans l'Etat partie","7032":"Ventes de produits intermédiaires hors Région","7033":"Ventes de produits intermédiaires aux entités du groupe dans la Region","7034":"Ventes de produits intermédiaires aux entités du groupe hors Région","7035":"Ventes de produits intermédiaires sur internet","7039":"Rabais, remises, ristournes accordés sur ventes de produits intermédiaires (non ventilés)","7041":"Ventes de produits résiduels dans l'Etat partie","7042":"Ventes de produits résiduels hors Région","7043":"Ventes de produits résiduels aux entités du groupe dans la Région","7044":"Ventes de produits résiduels aux entités du groupe hors Région","7049":"Rabais, remises, ristournes accordés sur ventes de produits résiduels(non ventilés)","7051":"Travaux facturés dans l'Etat partie","7052":"Travaux facturés hors Région","7053":"Travaux facturés aux entités du groupe dans la Région","7054":"Travaux facturés aux entités du groupe hors Région","7055":"Travaux facturés sur internet","7059":"Rabais, remises, ristournes accordés sur travaux facturés (non ventilés)","7061":"Services vendus dans l'Etat partie","7062":"Services vendus hors Région","7063":"Services vendus aux entités du groupe dans la Région","7064":"Services vendus aux entités du groupe hors Région","7065":"Services vendus sur internet","7069":"Rabais, remises, ristournes accordés sur services vendus (non ventilés)","7071":"Ports, emballages perdus et autres frais facturés","7072":"Commissions et courtages","7073":"Locations et redevance de location-financement","7074":"Bonis sur reprises et cessions d’emballages","7075":"Mise à disposition de personnel","7076":"Redevances pour brevets, logiciels, marques et droits similaires","7077":"Services exploités dans l’intérêt du personnel","7078":"Autres produits accessoires","7110":"Subvention d'exploitation sur produits à l’exportation","7120":"Subvention d'exploitation sur produits à l’importation","7130":"Subvention d'exploitation sur produits de péréquation","7140":"Indemnités et subventions d'exploitation (entité agricole)","7181":"Autres subventions d'exploitation versées par l’État et les collectivités publiques","7182":"Autres subventions d'exploitation versées par les organismes internationaux","7183":"Autres subventions d'exploitation versées par des tiers","7210":"Production immobilisée d' immobilisations incorporelles","7221":"Production immobilisée d'immobilisations corporelles (hors actifs biologiques)","7222":"Production immobilisée d'immobilisations corporelles (actifs biologiques)","7240":"Production auto-consommée","7260":"Production immobilisée d'immobilissations financieres","7341":"Produits en cours","7342":"Travaux en cours","7351":"Études en cours","7352":"Prestations de services en cours","7360":"Variations des stocks de produits finis","7371":"Produits intermédiaires","7372":"Produits résiduels","7510":"Profits sur créances clients et autres débiteurs","7521":"Quote-part transférée de pertes (comptabilité du gerant)","7525":"Bénéfices attribués par transfert (comptabilité des associés non gerant)","7541":"Produits de cessions courantes d'immobilisations incorporelles","7542":"Produits de cessions courantes d'immobilisations corporelles","7560":"Gains de change sur créances et dettes commerciales","7581":"Indemnités de fonction et autres renumerations d'admistrateurs","7582":"Indemnités d’assurances reçues","7588":"Autres produits divers","7591":"Reprises de charges pour dépréciations et provisions sur risques à court terme","7593":"Reprises de charges pour dépréciations et provisions sur stocks","7594":"Reprises de charges pour dépréciations et provisions sur créances","7598":"Reprises de dépréciations et provisions sur autres charges pour depreciations et provisions pour risques a court terme d'exploitation","7712":"Intérêts de prêts","7713":"Intérêts sur créances diverses","7721":"Revenus des titres de participation","7722":"Revenus des autres titres immobilisés","7730":"Escomptes obtenus","7745":"Revenus des obligations","7746":"Revenus des titres de placement","7750":"Interets dans loyers de location-financement","7760":"Gains de change financiers","7770":"Gains sur cessions de titres de placement","7781":"Gains sur rentes viagères","7782":"Gains sur opérations financières","7784":"Gains sur instruments de trésorerie","7791":"Reprises de provisions et dépréciations sur risques financiers","7795":"Reprises de provisions et dépréciations sur titres de placement","7798":"Reprises de provisions et dépréciations sur autres charges pour risques a court terme financières","7810":"Transferts de charges d’exploitation","7870":"Transferts de charges financieres","7911":"Reprises de provisions et dépréciations pour risques et charges","7913":"Reprises de provisions et dépréciations des immobilisations incorporelles","7914":"Reprises de provisions et dépréciations des immobilisations corporelles","7971":"Reprises de provisions et dépréciations pour risques et charges","7972":"Reprises de provisions et dépréciations des immobilisations financières","7980":"Reprises d’amortissements","7990":"Reprises de subventions d'investissement","8110":"Valeurs comptables des cessions d'immobilisations incorporelles","8120":"Valeurs comptables des cessions d'immobilisations corporelles","8160":"Valeurs comptables des cessions d'immobilisations financières","8210":"Produits des cessions d'immobilisations incorporelles","8220":"Produits des cessions d'immobilisations corporelles","8260":"Produits des cessions d'immobilisations financières","8310":"Charges HAO constatées","8330":"Charges liées aux opérations de restructuration","8340":"Pertes sur créances HAO","8350":"Dons et libéralités accordés","8360":"Abandons de créances consentis","8370":"Charges liées aux opérations de liquidation","8390":"Charges pour dépréciations et provisions pour risques a court terme HAO","8410":"Produits HAO constatés","8430":"Produits liés aux opérations de restructuration","8440":"Indemnités et subventions HAO (entité agricole)","8450":"Dons et libéralités obtenus","8460":"Abandons de créances obtenus","8470":"Produits liés aux operations de liquidation","8480":"Transferts de charges HAO","8490":"Reprises de charges pour dépréciations et provisions pour risques a court terme HAO","8510":"Dotations aux provisions réglementées","8520":"Dotations aux amortissements HAO","8530":"Dotations aux dépréciations HAO","8540":"Dotations aux provisions pour risques et charges HAO","8580":"Autres dotations HAO","8610":"Reprises de provisions réglementées","8620":"Reprises d’amortissements HAO","8630":"Reprises de dépréciation HAO","8640":"Reprises de provisions pour risques et charges HAO","8680":"Autres reprises HAO","8710":"Participation légale aux bénéfices","8740":"Participation contractuelle aux bénéfices","8780":"Autres participations","8810":"État","8840":"Collectivités publiques","8860":"Groupe","8880":"Autres","8911":"Impôts sur les bénéfices d'activités exercées dans l’État","8912":"Impôts sur les bénéfices d'activités exercées dans les autres Etats de la region","8913":"Impôts sur les bénéfices d'activités exercées hors Région","8920":"Rappel d’impôts sur résultats antérieurs","8950":"Impôt minimum forfaitaire IMF","8991":"Dégrèvements","8994":"Annulations pour pertes rétroactive","1310":"Résultat net: Bénéfice","1301":"Résultat en instance d’affectation : Bénéfice","1309":"Résultat en instance d’affectation : Perte","1320":"Marge commerciale (M.C)","1330":"Valeur ajoutée (V.A)","1340":"Excédent brut d’exploitation (E.B.E)","1350":"Résultat d’exploitation (R.E)","1360":"Résultat financier (R.F)","1370":"Résultat des activités ordinaires (R.A.O)","1381":"Résultat de fusion","1382":"Résultat d'apport partiel d'actif","1383":"Résultat de scission","1384":"Résultat de liquidation","1390":"Résultat net : perte"};
function liasseAccountLabel(code){
    var c = String(code||'');
    for(var len = Math.min(c.length,4); len >= 2; len--){
        var k = c.substring(0,len);
        if(LIASSE_PCG_LABELS[k]) return LIASSE_PCG_LABELS[k];
    }
    return 'Compte ' + c;
}

// ---------- Nature d'une REF (actif / passif / produit / charge / total) ----------
var LIASSE_REF_KIND = null;
function liasseRefKind(ref){
    if(!LIASSE_REF_KIND){
        LIASSE_REF_KIND = {};
        (LIASSE_DATA.actifLines||[]).forEach(function(l){ LIASSE_REF_KIND[l.ref] = 'actif'; });
        (LIASSE_DATA.passifLines||[]).forEach(function(l){ LIASSE_REF_KIND[l.ref] = 'passif'; });
        (LIASSE_DATA.resultatLines||[]).forEach(function(l){
            LIASSE_REF_KIND[l.ref] = (l.sign === '+') ? 'produit' : (l.sign === '-' ? 'charge' : 'total');
        });
    }
    return LIASSE_REF_KIND[ref] || 'passif';
}

// ---------- Détail par compte (4 chiffres) pour une liste de REF donnée ----------
// Regroupe les lignes de balance rattachées aux REF demandées, par compte à 4 chiffres,
// avec BRUT / AMORT.-DEPREC. / NET pour les postes d'actif, ou NET seul (bon sens de
// signe selon la nature passif/produit/charge) pour les autres.
function liasseAccountDetailRows(ex, refs, which){
    var rows = (typeof balanceData !== 'undefined' && balanceData[ex]) ? balanceData[ex] : [];
    var dField = (which === 'opening') ? 'od' : 'sd';
    var cField = (which === 'opening') ? 'oc' : 'sc';
    var buckets = {};
    for(var i=0;i<rows.length;i++){
        /* BUG CORRIGÉ (8 août 2026) : liasseFindRef() était appelée sans
           solde débiteur/créditeur, alors qu'elle en a besoin pour
           arbitrer entre deux postes de sens opposé qui se partagent la
           même racine de compte (ex. 4191 « Clients, avances reçues » :
           BI si débiteur, DI si créditeur). Sans solde, l'arbitrage
           tombait toujours sur le même poste par défaut — un compte
           créditeur pouvait ainsi apparaître, avec un montant négatif,
           dans le bloc du poste débiteur au lieu du sien. */
        var m = liasseFindRef(rows[i].compte, rows[i][dField], rows[i][cField]);
        if(!m || refs.indexOf(m.ref) === -1) continue;
        var raw = String(rows[i].compte||'').trim();
        var mm = raw.match(/^\d+/);
        if(!mm) continue;
        var key = mm[0].substring(0, Math.min(4, mm[0].length));
        if(!buckets[key]) buckets[key] = {compte:key, label: liasseAccountLabel(key), brut:0, amort:0, net:0};
        var sd = parseNum(rows[i][dField]) || 0, sc = parseNum(rows[i][cField]) || 0;
        if(m.col === 'brut'){ buckets[key].brut += (sd - sc); }
        else if(m.col === 'amort'){ buckets[key].amort += (sc - sd); }
        else {
            var kind = liasseRefKind(m.ref);
            buckets[key].net += (kind === 'passif' || kind === 'produit') ? (sc - sd) : (sd - sc);
        }
    }
    var out = Object.keys(buckets).map(function(k){
        var b = buckets[k];
        b.net = b.net + (b.brut - b.amort);
        return b;
    });
    out.sort(function(a,b){ return a.compte.localeCompare(b.compte); });
    return out;
}

// ---------- Configuration des 39 notes annexes (structure officielle DGI / SYSCOHADA) ----------
var NOTES_CONFIG = [{"num":"1","title":"REGLES ET METHODES COMPTABLES","type":"manual","sections":["Référentiel comptable appliqué (SYSCOHADA Révisé)","Méthode d'évaluation des immobilisations (coût historique, réévaluation)","Méthode d'amortissement retenue (linéaire / dégressif) et durées appliquées par catégorie","Méthode de valorisation des stocks (CUMP, FIFO...)","Méthode de conversion des créances et dettes en devises","Changements de méthode intervenus au cours de l'exercice et leur justification"]},{"num":"2","title":"INFORMATIONS OBLIGATOIRES","type":"manual","sections":["Forme juridique de l'entité","Nom commercial et siège social","Activité principale exercée","Durée de l'exercice comptable (12 mois sauf exception à préciser)","Événements significatifs de l'exercice ayant affecté la comparabilité des comptes","Effectif moyen de l'exercice"]},{"num":"3A","title":"IMMOBILISATIONS (BRUTES)","type":"auto-mvt","blocks":[{"title":"IMMOBILISATIONS INCORPORELLES","refs":["AE","AF","AG","AH"]},{"title":"IMMOBILISATIONS CORPORELLES","refs":["AJ","AK","AL","AM","AN"]},{"title":"AVANCES ET ACOMPTES VERSES SUR IMMOBILISATIONS","refs":["AP"]},{"title":"IMMOBILISATIONS FINANCIERES","refs":["AR","AS"]}]},{"num":"3B","title":"BIENS PRIS EN LOCATION ACQUISITION (CREDIT-BAIL)","type":"manual","sections":["Nature du bien pris en location-acquisition","Valeur d'origine du bien au contrat","Durée du contrat et date d'échéance","Cumul des redevances payées à la clôture","Redevances restant à payer","Option d'achat en fin de contrat (montant, levée prévue ou non)"]},{"num":"3C","title":"IMMOBILISATIONS (AMORTISSEMENTS)","type":"auto-mvt-amort","blocks":[{"title":"IMMOBILISATIONS INCORPORELLES","refs":["AE","AF","AG","AH"]},{"title":"IMMOBILISATIONS CORPORELLES","refs":["AJ","AK","AL","AM","AN"]}]},{"num":"3C BIS","title":"IMMOBILISATIONS (DEPRECIATIONS)","type":"auto-detail","kind":"actif","cols":["amort"],"blocks":[{"title":"IMMOBILISATIONS FINANCIERES — DEPRECIATIONS","refs":["AR","AS"]}]},{"num":"3D","title":"IMMOBILISATIONS (PLUS-VALUES ET MOINS-VALUES DE CESSION)","type":"manual","sections":["Désignation du bien cédé","Valeur d'origine (brute)","Amortissements cumulés à la date de cession","Valeur nette comptable (VNC)","Prix de cession","Plus-value ou moins-value dégagée (Prix de cession — VNC)"]},{"num":"3E","title":"INFORMATIONS SUR LES REEVALUATIONS EFFECTUEES PAR L'ENTITE","type":"manual","sections":["Date de la réévaluation","Immobilisations concernées par la réévaluation","Méthode de réévaluation utilisée","Montant de l'écart de réévaluation dégagé","Incidence sur les dotations aux amortissements futures"]},{"num":"4","title":"IMMOBILISATIONS FINANCIERES","type":"auto-detail","kind":"actif","blocks":[{"title":"IMMOBILISATIONS FINANCIERES — DETAIL PAR COMPTE","refs":["AR","AS"]}]},{"num":"5","title":"ACTIF CIRCULANT ET DETTES CIRCULANTES HAO","type":"auto-detail","blocks":[{"title":"ACTIF CIRCULANT HAO","refs":["BA"],"kind":"actif"},{"title":"DETTES CIRCULANTES HAO","refs":["DH"],"kind":"passif"}]},{"num":"6","title":"STOCKS ET EN COURS","type":"auto-detail","kind":"actif","blocks":[{"title":"STOCKS ET EN-COURS — DETAIL PAR COMPTE","refs":["BB"]}]},{"num":"7","title":"CLIENTS","type":"auto-detail","blocks":[{"title":"CLIENTS — DETAIL PAR COMPTE","refs":["BI"],"kind":"actif"},{"title":"CLIENTS, AVANCES REÇUES — DETAIL PAR COMPTE","refs":["DI"],"kind":"passif"}]},{"num":"8","title":"AUTRES CREANCES","type":"auto-detail","kind":"actif","blocks":[{"title":"AUTRES CREANCES — DETAIL PAR COMPTE","refs":["BJ"]}]},{"num":"8A","title":"TABLEAU D'ETALEMENT DES CHARGES IMMOBILISEES","type":"manual","sections":["Nature de la charge immobilisée","Montant total immobilisé","Durée d'étalement retenue","Charge de l'exercice (dotation)","Solde restant à étaler à la clôture"]},{"num":"8B","title":"TABLEAU D'ETALEMENT DE PROVISIONS POUR CHARGES A REPARTIR","type":"manual","sections":["Nature de la charge à répartir","Montant total provisionné","Durée de répartition retenue","Dotation de l'exercice","Solde de la provision à la clôture"]},{"num":"8C","title":"TABLEAU D'ETALEMENT DE PROVISIONS POUR ENGAGEMENTS DE RETRAITE","type":"manual","sections":["Méthode d'évaluation de l'engagement (actuarielle ou forfaitaire)","Montant total de l'engagement évalué","Durée d'étalement retenue le cas échéant","Dotation de l'exercice","Solde de la provision à la clôture"]},{"num":"9","title":"TITRES DE PLACEMENT","type":"auto-detail","kind":"actif","blocks":[{"title":"TITRES DE PLACEMENT — DETAIL PAR COMPTE","refs":["BQ"]}]},{"num":"10","title":"VALEURS A ENCAISSER","type":"auto-detail","kind":"actif","blocks":[{"title":"VALEURS A ENCAISSER — DETAIL PAR COMPTE","refs":["BR"]}]},{"num":"11","title":"DISPONIBILITES","type":"auto-detail","kind":"actif","blocks":[{"title":"BANQUES, CHEQUES POSTAUX, CAISSE ET ASSIMILES","refs":["BS"]}]},{"num":"12","title":"ECARTS DE CONVERSION ET TRANSFERTS DE CHARGES","type":"auto-detail","blocks":[{"title":"ECART DE CONVERSION — ACTIF","refs":["BU"],"kind":"actif"},{"title":"ECART DE CONVERSION — PASSIF","refs":["DV"],"kind":"passif"},{"title":"TRANSFERTS DE CHARGES D'EXPLOITATION ET FINANCIERES","refs":["TI","TM"],"kind":"resultat"}]},{"num":"13","title":"CAPITAL","type":"auto-detail","kind":"passif","blocks":[{"title":"CAPITAL — DETAIL PAR COMPTE","refs":["CA","CB"]}]},{"num":"14","title":"PRIMES ET RESERVES","type":"auto-detail","kind":"passif","blocks":[{"title":"PRIMES, RESERVES ET REPORT A NOUVEAU","refs":["CD","CF","CG","CH"]}]},{"num":"15A","title":"SUBVENTIONS D'INVESTISSEMENT ET PROVISIONS REGLEMENTEES","type":"auto-detail","kind":"passif","blocks":[{"title":"SUBVENTIONS D'INVESTISSEMENT ET PROVISIONS REGLEMENTEES","refs":["CL","CM"]}]},{"num":"15B","title":"INFORMATIONS COMPLEMENTAIRES SUR LES SUBVENTIONS ET PROVISIONS REGLEMENTEES","type":"manual","sections":["Nature et origine des subventions d'investissement","Modalités de reprise au compte de résultat","Nature des provisions réglementées constituées"]},{"num":"16A","title":"DETTES FINANCIERES ET RESSOURCES ASSIMILEES","type":"auto-detail","kind":"passif","blocks":[{"title":"EMPRUNTS, DETTES DE LOCATION-ACQUISITION ET PROVISIONS POUR RISQUES","refs":["DA","DB","DC"]}]},{"num":"16B","title":"ENGAGEMENTS DE RETRAITE ET AVANTAGES ASSIMILES (METHODE ACTUARIELLE)","type":"manual","sections":["Hypothèses actuarielles retenues (taux d'actualisation, taux de croissance des salaires, table de mortalité, âge de départ)","Engagement net à l'ouverture de l'exercice","Coût des services rendus au cours de l'exercice","Charge d'intérêt sur l'engagement","Prestations versées au cours de l'exercice","Engagement net à la clôture de l'exercice"]},{"num":"16B BIS","title":"ENGAGEMENTS DE RETRAITE ET AVANTAGES ASSIMILES — SUITE","type":"manual","sections":["Écarts actuariels générés sur l'exercice et mode de comptabilisation retenu","Sensibilité de l'engagement à une variation des hypothèses actuarielles","Régimes de retraite à cotisations définies (le cas échéant)"]},{"num":"16C","title":"ACTIFS ET PASSIFS EVENTUELS","type":"manual","sections":["Nature du litige ou de l'engagement éventuel","Montant estimé du risque","Probabilité de réalisation et justification de l'absence de provision"]},{"num":"17","title":"FOURNISSEURS D'EXPLOITATION","type":"auto-detail","blocks":[{"title":"FOURNISSEURS, AVANCES VERSEES — DETAIL PAR COMPTE","refs":["BH"],"kind":"actif"},{"title":"FOURNISSEURS D'EXPLOITATION — DETAIL PAR COMPTE","refs":["DJ"],"kind":"passif"}]},{"num":"18","title":"DETTES FISCALES ET SOCIALES","type":"auto-detail","kind":"passif","blocks":[{"title":"DETTES FISCALES ET SOCIALES — DETAIL PAR COMPTE","refs":["DK"]}]},{"num":"19","title":"AUTRES DETTES ET PROVISIONS POUR RISQUES ET CHARGES A COURT TERME","type":"auto-detail","kind":"passif","blocks":[{"title":"AUTRES DETTES ET PROVISIONS A COURT TERME — DETAIL PAR COMPTE","refs":["DM","DN"]}]},{"num":"20","title":"BANQUES, CREDIT D'ESCOMPTE ET DE TRESORERIE","type":"auto-detail","kind":"passif","blocks":[{"title":"BANQUES, CREDITS D'ESCOMPTE ET DE TRESORERIE — DETAIL PAR COMPTE","refs":["DQ","DR"]}]},{"num":"21","title":"CHIFFRE D'AFFAIRES ET AUTRES PRODUITS","type":"auto-detail","kind":"resultat","blocks":[{"title":"VENTES, TRAVAUX, PRODUITS ACCESSOIRES ET AUTRES PRODUITS D'EXPLOITATION","refs":["TA","TB","TC","TD","TF","TG","TH"]}]},{"num":"22","title":"ACHATS","type":"auto-detail","kind":"resultat","blocks":[{"title":"ACHATS DE MARCHANDISES, MATIERES ET AUTRES APPROVISIONNEMENTS","refs":["RA","RC","RE"]}]},{"num":"23","title":"TRANSPORTS","type":"auto-detail","kind":"resultat","blocks":[{"title":"TRANSPORTS — DETAIL PAR COMPTE","refs":["RG"]}]},{"num":"24","title":"SERVICES EXTERIEURS","type":"auto-detail","kind":"resultat","blocks":[{"title":"SERVICES EXTERIEURS — DETAIL PAR COMPTE","refs":["RH"]}]},{"num":"25","title":"IMPOTS ET TAXES","type":"auto-detail","kind":"resultat","blocks":[{"title":"IMPOTS ET TAXES — DETAIL PAR COMPTE","refs":["RI"]}]},{"num":"26","title":"AUTRES CHARGES","type":"auto-detail","kind":"resultat","blocks":[{"title":"AUTRES CHARGES — DETAIL PAR COMPTE","refs":["RJ"]}]},{"num":"27A","title":"CHARGES DE PERSONNEL","type":"auto-detail","kind":"resultat","blocks":[{"title":"CHARGES DE PERSONNEL — DETAIL PAR COMPTE","refs":["RK"]}]},{"num":"27B","title":"EFFECTIFS, MASSE SALARIALE ET PERSONNEL EXTERIEUR","type":"manual","sections":["Effectif par catégorie : Cadres, Agents de maîtrise, Employés, Ouvriers (exercice N et N-1)","Masse salariale par catégorie","Personnel extérieur à l'entité (intérimaires, mise à disposition)","Effectif national / expatrié"]},{"num":"28","title":"DOTATIONS ET CHARGES POUR PROVISIONS ET DEPRECIATIONS","type":"auto-detail","blocks":[{"title":"PROVISIONS POUR RISQUES ET CHARGES (MOUVEMENT DE L'EXERCICE)","refs":["DC"],"kind":"passif","col":"net","type":"auto-mvt-amort"},{"title":"PROVISIONS POUR RISQUES A COURT TERME (MOUVEMENT DE L'EXERCICE)","refs":["DN"],"kind":"passif","col":"net","type":"auto-mvt-amort"},{"title":"DOTATIONS D'EXPLOITATION AUX AMORTISSEMENTS, PROVISIONS ET DEPRECIATIONS","refs":["RL"],"kind":"resultat"},{"title":"DOTATIONS FINANCIERES AUX PROVISIONS ET DEPRECIATIONS","refs":["RN"],"kind":"resultat"},{"title":"REPRISES D'EXPLOITATION","refs":["TJ"],"kind":"resultat"},{"title":"REPRISES FINANCIERES","refs":["TL"],"kind":"resultat"}]},{"num":"29","title":"CHARGES ET REVENUS FINANCIERS","type":"auto-detail","blocks":[{"title":"FRAIS FINANCIERS ET CHARGES ASSIMILEES","refs":["RM"],"kind":"resultat"},{"title":"REVENUS FINANCIERS ET ASSIMILES","refs":["TK"],"kind":"resultat"}]},{"num":"30","title":"AUTRES CHARGES ET PRODUITS HAO","type":"auto-detail","blocks":[{"title":"AUTRES CHARGES HAO","refs":["RP"],"kind":"resultat"},{"title":"AUTRES PRODUITS HAO","refs":["TO"],"kind":"resultat"}]},{"num":"31","title":"REPARTITION DU RESULTAT ET ELEMENTS CARACTERISTIQUES DES 5 DERNIERS EXERCICES","type":"manual","sections":["Proposition d'affectation du résultat de l'exercice N (réserves, report à nouveau, dividendes)","Capital social — exercices N, N-1, N-2, N-3, N-4","Résultat net — exercices N, N-1, N-2, N-3, N-4","Effectif moyen — exercices N, N-1, N-2, N-3, N-4"]},{"num":"32","title":"PRODUCTION DE L'EXERCICE","type":"auto-custom","calc":"production"},{"num":"33","title":"ACHATS DESTINES A LA PRODUCTION","type":"auto-custom","calc":"achatsProduction"},{"num":"34","title":"FICHE DE SYNTHESE DES PRINCIPAUX INDICATEURS FINANCIERS","type":"auto-custom","calc":"synthese"},{"num":"35","title":"NOTE OBLIGATOIRE POUR LES ENTITES AYANT UN EFFECTIF DE PLUS DE 250 SALARIES","type":"manual","sections":["Informations sociales complémentaires exigées (formation, œuvres sociales, accidents du travail)","Représentation du personnel et dialogue social","Politique de rémunération et d'intéressement"]},{"num":"36","title":"TABLE DES CODES","type":"note36-codes"},{"num":"36S","title":"NOMENCLATURE CIAP (SUITE NOTE 36)","type":"note36-nomenclature"},{"num":"37","title":"DETERMINATION DE L'IMPOT SUR LE RESULTAT","type":"manual","sections":["Résultat comptable avant impôt","Réintégrations fiscales (charges non déductibles)","Déductions fiscales (produits non imposables)","Résultat fiscal de l'exercice","Taux de l'impôt sur les sociétés appliqué (se référer à l'onglet Référentiel légal et fiscal)","Impôt sur les sociétés dû, comparé à l'Impôt Minimum Forfaitaire (IMF) lorsqu'applicable"]},{"num":"38","title":"EVENEMENTS POSTERIEURS A LA CLOTURE DE L'EXERCICE","type":"manual","sections":["Description de l'événement postérieur à la clôture","Date de survenance","Impact estimé sur la situation financière ou les résultats futurs"]},{"num":"39","title":"CHANGEMENTS DE METHODES COMPTABLES, D'ESTIMATIONS ET CORRECTIONS D'ERREURS","type":"manual","sections":["Nature du changement de méthode comptable, d'estimation ou de l'erreur corrigée","Justification du changement","Incidence chiffrée sur les capitaux propres d'ouverture et sur le résultat de l'exercice"]}];
var LIASSE_CURRENT_NOTE = null;

function liasseNoteByNum(num){
    for(var i=0;i<NOTES_CONFIG.length;i++){ if(NOTES_CONFIG[i].num === num) return NOTES_CONFIG[i]; }
    return null;
}

// ---------- Rendu : bloc détail par compte (actif / passif / résultat) ----------
function liasseRenderDetailBlock(block){
    var kind = block.kind || 'actif';
    var n = liasseAccountDetailRows('n', block.refs);
    var n1 = liasseAccountDetailRows('n1', block.refs);
    var byCompteN1 = {}; n1.forEach(function(r){ byCompteN1[r.compte] = r; });
    var comptes = n.map(function(r){ return r.compte; });
    n1.forEach(function(r){ if(comptes.indexOf(r.compte) === -1) comptes.push(r.compte); });
    comptes.sort();
    var byCompteN = {}; n.forEach(function(r){ byCompteN[r.compte] = r; });
    var totN = {brut:0,amort:0,net:0}, totN1 = {brut:0,amort:0,net:0};
    var rows = comptes.map(function(c){
        var rn = byCompteN[c] || {label: liasseAccountLabel(c), brut:0, amort:0, net:0};
        var rn1 = byCompteN1[c] || {brut:0, amort:0, net:0};
        totN.brut+=rn.brut; totN.amort+=rn.amort; totN.net+=rn.net;
        totN1.brut+=rn1.brut; totN1.amort+=rn1.amort; totN1.net+=rn1.net;
        if(kind === 'actif'){
            return '<tr><td>'+c+'</td><td>'+rn.label+'</td>'+
                '<td class="num">'+liasseFmt(rn.brut)+'</td><td class="num">'+liasseFmt(rn.amort)+'</td>'+
                '<td class="num">'+liasseFmt(rn.net)+'</td><td class="num">'+liasseFmt(rn1.net)+'</td></tr>';
        }
        return '<tr><td>'+c+'</td><td>'+rn.label+'</td>'+
            '<td class="num">'+liasseFmt(rn.net)+'</td><td class="num">'+liasseFmt(rn1.net)+'</td></tr>';
    }).join('');
    if(!comptes.length){
        var span = kind === 'actif' ? 6 : 4;
        rows = '<tr><td colspan="'+span+'" style="text-align:center;color:#999;padding:16px;">Aucun compte mouvementé sur ce poste dans la balance N / N-1.</td></tr>';
    }
    var foot = kind === 'actif'
        ? '<tr class="liasse-total-row"><td colspan="2">TOTAL</td>'+
          '<td class="num">'+liasseFmt(totN.brut)+'</td><td class="num">'+liasseFmt(totN.amort)+'</td>'+
          '<td class="num">'+liasseFmt(totN.net)+'</td><td class="num">'+liasseFmt(totN1.net)+'</td></tr>'
        : '<tr class="liasse-total-row"><td colspan="2">TOTAL</td>'+
          '<td class="num">'+liasseFmt(totN.net)+'</td><td class="num">'+liasseFmt(totN1.net)+'</td></tr>';
    var head = kind === 'actif'
        ? '<tr><th>COMPTE</th><th>LIBELLE</th><th>BRUT</th><th>AMORT./DEPREC.</th><th>NET N</th><th>NET N-1</th></tr>'
        : '<tr><th>COMPTE</th><th>LIBELLE</th><th>EXERCICE N</th><th>EXERCICE N-1</th></tr>';
    return '<div class="liasse-note-block"><h4>'+block.title+'</h4>'+
        '<table class="liasse-table"><thead>'+head+'</thead><tbody>'+rows+foot+'</tbody></table></div>';
}

// ---------- Rendu : bloc tableau de mouvements (immobilisations brutes — NOTE 3A) ----------
function liasseRenderMvtBlock(block, ex){
    ex = ex || 'n';
    var mapByRef = {}; (LIASSE_DATA.actifLines||[]).forEach(function(l){ mapByRef[l.ref]=l; });
    var totOuv=0, totAcq=0, totCes=0, totClo=0;
    var rows = block.refs.map(function(ref){
        var line = mapByRef[ref] || {label:ref};
        var ouverture = liasseSumByRef(ex, ref, 'brut', 'SD-SC', 'opening');
        var acquisitions = liasseSumMovementByRef(ex, [ref], 'md');
        var cessions = liasseSumMovementByRef(ex, [ref], 'mc');
        var cloture = liasseSumByRef(ex, ref, 'brut', 'SD-SC', 'closing');
        totOuv+=ouverture; totAcq+=acquisitions; totCes+=cessions; totClo+=cloture;
        return '<tr><td>'+ref+'</td><td>'+line.label+'</td>'+
            '<td class="num">'+liasseFmt(ouverture)+'</td><td class="num">'+liasseFmt(acquisitions)+'</td>'+
            '<td class="num">'+liasseFmt(cessions)+'</td><td class="num">'+liasseFmt(cloture)+'</td></tr>';
    }).join('');
    var foot = '<tr class="liasse-total-row"><td colspan="2">TOTAL</td>'+
        '<td class="num">'+liasseFmt(totOuv)+'</td><td class="num">'+liasseFmt(totAcq)+'</td>'+
        '<td class="num">'+liasseFmt(totCes)+'</td><td class="num">'+liasseFmt(totClo)+'</td></tr>';
    return '<div class="liasse-note-block"><h4>'+block.title+'</h4>'+
        '<table class="liasse-table"><thead><tr><th>REF</th><th>LIBELLE</th>'+
        '<th>VALEUR BRUTE OUVERTURE</th><th>ACQUISITIONS</th><th>CESSIONS / DIMINUTIONS</th><th>VALEUR BRUTE CLOTURE</th></tr></thead>'+
        '<tbody>'+rows+foot+'</tbody></table></div>';
}

// ---------- Rendu : bloc tableau de mouvements des amortissements (NOTE 3C)
//            et, par généralisation, des provisions (NOTE 28) ----------
//
// block.col ('amort' par défaut) : quelle colonne du poste porte les
// comptes à mouvementer. NOTE 3C l'omet (comportement historique inchangé,
// col:'amort'). NOTE 28 la fixe à 'net' pour DC/DN — des postes de PASSIF
// sans distinction brut/amort, mais tout aussi créditeurs (même sens
// SC-SD, mêmes colonnes mouvement crédit = augmentation).
// block.kind ('actif' par défaut) : d'où viennent les libellés des REF.
function liasseRenderMvtAmortBlock(block, ex){
    ex = ex || 'n';
    var col = block.col || 'amort';
    var sourceLignes = (block.kind === 'passif') ? LIASSE_DATA.passifLines : LIASSE_DATA.actifLines;
    var mapByRef = {}; (sourceLignes||[]).forEach(function(l){ mapByRef[l.ref]=l; });
    var totOuv=0, totDot=0, totRep=0, totClo=0;
    var rows = block.refs.map(function(ref){
        var line = mapByRef[ref] || {label:ref};
        var ouverture = liasseSumByRef(ex, ref, col, 'SC-SD', 'opening');
        // Les dotations et reprises se lisent sur les comptes eux-mêmes de
        // la colonne « col », pas sur les comptes bruts du poste qui les porte.
        var dotations = liasseSumMovementByRef(ex, [ref], 'mc', col);
        var reprises = liasseSumMovementByRef(ex, [ref], 'md', col);
        var cloture = liasseSumByRef(ex, ref, col, 'SC-SD', 'closing');
        totOuv+=ouverture; totDot+=dotations; totRep+=reprises; totClo+=cloture;
        return '<tr><td>'+ref+'</td><td>'+line.label+'</td>'+
            '<td class="num">'+liasseFmt(ouverture)+'</td><td class="num">'+liasseFmt(dotations)+'</td>'+
            '<td class="num">'+liasseFmt(reprises)+'</td><td class="num">'+liasseFmt(cloture)+'</td></tr>';
    }).join('');
    var foot = '<tr class="liasse-total-row"><td colspan="2">TOTAL</td>'+
        '<td class="num">'+liasseFmt(totOuv)+'</td><td class="num">'+liasseFmt(totDot)+'</td>'+
        '<td class="num">'+liasseFmt(totRep)+'</td><td class="num">'+liasseFmt(totClo)+'</td></tr>';
    var libColonne = (col === 'net') ? 'PROVISION' : 'AMORT.';
    return '<div class="liasse-note-block"><h4>'+block.title+'</h4>'+
        '<table class="liasse-table"><thead><tr><th>REF</th><th>LIBELLE</th>'+
        '<th>'+libColonne+' OUVERTURE</th><th>DOTATIONS EXERCICE</th><th>REPRISES / SORTIES</th><th>'+libColonne+' CLOTURE</th></tr></thead>'+
        '<tbody>'+rows+foot+'</tbody></table></div>';
}

// ---------- Rendu : notes calculées sur mesure (32, 33, 34) ----------
function liasseRenderCustomNote(cfg){
    if(cfg.calc === 'production'){
        var rn = liasseGetResultat('n'), rn1 = liasseGetResultat('n1');
        var lignes = [
            {label:'Ventes de produits fabriqués', ref:'TB'},
            {label:'Travaux, services vendus', ref:'TC'},
            {label:'Production stockée (ou déstockage)', ref:'TE'},
            {label:'Production immobilisée', ref:'TF'}
        ];
        var totN=0, totN1=0;
        var rows = lignes.map(function(l){ totN+=rn[l.ref]; totN1+=rn1[l.ref];
            return '<tr><td>'+l.ref+'</td><td>'+l.label+'</td><td class="num">'+liasseFmt(rn[l.ref])+'</td><td class="num">'+liasseFmt(rn1[l.ref])+'</td></tr>'; }).join('');
        return '<table class="liasse-table"><thead><tr><th>REF</th><th>LIBELLE</th><th>EXERCICE N</th><th>EXERCICE N-1</th></tr></thead><tbody>'+rows+
            '<tr class="liasse-total-row"><td colspan="2">PRODUCTION DE L\'EXERCICE</td><td class="num">'+liasseFmt(totN)+'</td><td class="num">'+liasseFmt(totN1)+'</td></tr></tbody></table>';
    }
    if(cfg.calc === 'achatsProduction'){
        var rn = liasseGetResultat('n'), rn1 = liasseGetResultat('n1');
        var achatsN = rn.RC - rn.RD, achatsN1 = rn1.RC - rn1.RD;
        return '<table class="liasse-table"><thead><tr><th>REF</th><th>LIBELLE</th><th>EXERCICE N</th><th>EXERCICE N-1</th></tr></thead><tbody>'+
            '<tr><td>RC</td><td>Achats de matières premières et fournitures liées</td><td class="num">'+liasseFmt(rn.RC)+'</td><td class="num">'+liasseFmt(rn1.RC)+'</td></tr>'+
            '<tr><td>RD</td><td>Variation de stocks de matières premières et fournitures liées</td><td class="num">'+liasseFmt(rn.RD)+'</td><td class="num">'+liasseFmt(rn1.RD)+'</td></tr>'+
            '<tr class="liasse-total-row"><td colspan="2">ACHATS CONSOMMES DESTINES A LA PRODUCTION</td><td class="num">'+liasseFmt(achatsN)+'</td><td class="num">'+liasseFmt(achatsN1)+'</td></tr></tbody></table>';
    }
    if(cfg.calc === 'synthese'){
        var rn = liasseGetResultat('n'), rn1 = liasseGetResultat('n1');
        var cafgN = liasseGetCAFG('n'), cafgN1 = liasseGetCAFG('n1');
        var lignes = [
            {label:"Chiffre d'affaires", n:rn.XB, n1:rn1.XB},
            {label:'Marge commerciale', n:rn.XA, n1:rn1.XA},
            {label:'Valeur ajoutée', n:rn.XC, n1:rn1.XC},
            {label:"Excédent brut d'exploitation (EBE)", n:rn.XD, n1:rn1.XD},
            {label:"Résultat d'exploitation", n:rn.XE, n1:rn1.XE},
            {label:'Résultat financier', n:rn.XF, n1:rn1.XF},
            {label:'Résultat des activités ordinaires', n:rn.XG, n1:rn1.XG},
            {label:'Résultat hors activités ordinaires', n:rn.XH, n1:rn1.XH},
            {label:'Résultat net', n:rn.XI, n1:rn1.XI},
            {label:"Capacité d'Autofinancement Globale (CAFG)", n:cafgN, n1:cafgN1, bold:true}
        ];
        var rows = lignes.map(function(l){
            var cls = l.bold ? ' class="liasse-total-row"' : '';
            var evo = (l.n1) ? (((l.n-l.n1)/Math.abs(l.n1))*100) : null;
            var evoTxt = (evo===null || !isFinite(evo)) ? '—' : (evo>=0?'+':'')+evo.toFixed(1)+'%';
            return '<tr'+cls+'><td>'+l.label+'</td><td class="num">'+liasseFmt(l.n)+'</td><td class="num">'+liasseFmt(l.n1)+'</td><td class="num">'+evoTxt+'</td></tr>';
        }).join('');
        return '<table class="liasse-table"><thead><tr><th>SOLDES INTERMEDIAIRES DE GESTION</th><th>ANNEE N</th><th>ANNEE N-1</th><th>VARIATION</th></tr></thead><tbody>'+rows+'</tbody></table>'+
            '<div style="font-size:11px;color:#666;margin-top:14px;">La CAFG est calculée selon la formule officielle de la NOTE 34 (EBE + produits/charges financiers et HAO encaissables, hors participation et impôts) — voir aussi l\'onglet TFT qui la réutilise directement.</div>';
    }
    return '<div class="liasse-soon">Calcul non disponible.</div>';
}

// ---------- Rendu : note manuelle (gabarit éditable, saisie libre de l'auditeur) ----------
function liasseRenderManualNote(cfg){
    var sections = (cfg.sections||[]).map(function(s, idx){
        return '<div class="liasse-note-manual-section">'+
            '<div class="liasse-note-manual-label">'+(idx+1)+'. '+s+'</div>'+
            '<div class="liasse-note-manual-field" contenteditable="true" data-note="'+cfg.num+'" data-field="'+idx+'"></div>'+
        '</div>';
    }).join('');
    return '<div class="liasse-note-manual-hint">📝 Note à renseigner par l\'auditeur — champs de saisie libre ci-dessous (non calculables automatiquement à partir de la seule balance générale).</div>'+
        sections;
}

// ---------- Dispatcher principal ----------

// ---------- NOTE 36 : TABLE DES CODES (formes juridiques, régimes fiscaux, pays du siège social) ----------
var NOTE36_FORMES = [
    ['0','Société Anonyme (SA) à participation publique'],
    ['1','Société Anonyme (SA)'],
    ['2','Société par Actions Simplifiée (SAS)'],
    ['3','Société à Responsabilité Limitée (SARL)'],
    ['4','Société en Commandite Simple (SCS)'],
    ['5','Société en Nom Collectif (SNC)'],
    ['6','Société en Participation (SP)'],
    ['7',"Groupement d'Intérêt Economique (GIE)"],
    ['8','Association'],
    ['9','Autre forme juridique (à préciser)']
];
var NOTE36_REGIMES = [
    ['1','Réel normal'],
    ['2','Réel simplifié'],
    ['3','Synthétique'],
    ['4','Forfait']
];
var NOTE36_PAYS = [
    ['—','Pays UEMOA (Bénin=01, Burkina=02, Côte d\'Ivoire=03, Guinée Bissau=04, Mali=05, Niger=06, Sénégal=07, Togo=08)'],
    ['—','Pays CEMAC (Cameroun=09, Centrafrique=10, Congo=11, Gabon=12, Guinée Equatoriale=13, Tchad=14)'],
    ['—','Autres pays OHADA (Comores=15, Guinée Conakry=16)'],
    ['20','Afrique du Sud'],
    ['21','Autres pays africains'],
    ['22','Suisse'],
    ['23','France'],
    ['39','Autres pays de l\'Union Européenne'],
    ['40','U.S.A.'],
    ['41','Canada'],
    ['43','Brésil'],
    ['49','Autres pays américains'],
    ['50','Chine'],
    ['52','Inde'],
    ['53','Liban'],
    ['59','Autres pays asiatiques'],
    ['60','Russie'],
    ['99','Autres pays']
];
function liasseRenderNote36Codes(){
    function tbl(title, rows, headCode, headLabel){
        var trs = rows.map(function(r){ return '<tr><td style="width:70px;text-align:center;font-weight:700;">'+r[0]+'</td><td>'+r[1]+'</td></tr>'; }).join('');
        return '<div class="liasse-note-block"><h4>'+title+'</h4>'+
            '<table class="liasse-table"><thead><tr><th style="width:70px;">'+headCode+'</th><th>'+headLabel+'</th></tr></thead><tbody>'+trs+'</tbody></table></div>';
    }
    return '<div class="alert alert-info" style="margin-bottom:14px;">Cette table de codes officielle (DGI / SYSCOHADA Révisé) sert à renseigner les champs codifiés de la <strong>FICHE R2</strong> (forme juridique, régime fiscal, pays du siège social) et, via la Note 36 (suite), le code activité de la <strong>FICHE R2</strong>.</div>'+
        tbl('1 — CODE FORME JURIDIQUE', NOTE36_FORMES, 'Code', 'Forme juridique') +
        '<div style="font-size:11px;color:#666;margin:-10px 0 16px 0;">Remplacer le premier chiffre 0 par 1 si l\'entité bénéficie d\'un agrément prioritaire (le code s\'écrit alors sur 2 chiffres, ex. 13 pour une SARL agréée).</div>' +
        tbl('2 — CODE REGIME FISCAL', NOTE36_REGIMES, 'Code', 'Régime fiscal') +
        tbl('3 — CODE PAYS DU SIEGE SOCIAL', NOTE36_PAYS, 'Code', 'Pays / zone');
}

// ---------- NOTE 36 (suite) : NOMENCLATURE CIAP — CODES ACTIVITES ECONOMIQUES ----------
var NOTE36_CIAP=[
["A0101",'AGRICULTURE VIVRIERE',1],
["A010101",'Culture de céréales',0],
["A010102",'Culture de tubercules',0],
["A010103",'Culture de fruits',0],
["A010104",'Culture de légumes et plantes à épices et aromatiques',0],
["A0102",'AGRICULTURE DESTINEE A L\'INDUSTRIE OU A L\'EXPORTATION',1],
["A010201",'Culture du  cacao',0],
["A010202",'Culture du café',0],
["A010203",'Hévéaculture',0],
["A010204",'Culture du coton',0],
["A010205",'Culture de la banane douce , de l\'ananas et la mangue',0],
["A010206",'Culture de l\'anacarde',0],
["A010207",'Culture de la canne a sucre',0],
["A010208",'Culture de graines et fruits oléagineux',0],
["A010209",'Horticulture et Reproduction des plantes',0],
["A010210",'Culture d\'autres produits destinés à l\'industrie ou à l\'exportation',0],
["A0103",'ELEVAGE ET CHASSE',1],
["A010301",'Elevage',0],
["A010302",'Chasse',0],
["A0104",'ACTIVITES ANNEXES A L\'AGRICULTURE, L\'ELEVAGE ET LA CHASSE',1],
["A010401",'Activités de soutien à l\'agriculture',0],
["A010402",'Activités de soutien à l\'élevage',0],
["A010403",'Activités de soutien à la chasse',0],
["A0201",'SYLVICULTURE ET EXPLOITATION FORESTIERE',1],
["A020101",'Sylviculture',0],
["A020102",'Exploitation Forestière',0],
["A020103",'Production de charbon de bois',0],
["A020200",'Cueillettes, récolte de produits forestiers non ligneux',0],
["A0203",'ACTIVITES DE SOUTIEN A LA SYLVICULTURE ET A L\'EXPLOITATION FORESTIERE',1],
["A020300",'Activités de soutien à la sylviculture et à l\'exploitation forestière',0],
["A0301",'PECHE',1],
["A030101",'Pêche maritime',0],
["A030102",'Pêche en eau douce',0],
["A0302",'AQUACULTURE, PISCICULTURE',1],
["A030201",'Pisciculture',0],
["A030202",'Aquaculture',0],
["B0500",'EXTRACTION DE CHARBON ET DE LIGNITE',1],
["B050000",'Extraction de charbon et de lignite',0],
["B06",'EXTRACTION D\'HYDROCARBURES',1],
["B0600",'EXTRACTION D\'HYDROCARBURES',1],
["B060001",'Extraction de pétrole brut',0],
["B060002",'Extraction de gaz naturel',0],
["B07",'EXTRACTION DE MINERAIS MÉTALLIQUES',1],
["B0701",'EXTRACTION DE MINERAIS DE FER',1],
["B070100",'Extraction de minerais de fer',0],
["B0702",'EXTRACTION DE MINERAIS DE METAUX NON FERREUX',1],
["B070201",'Extraction de minerais de métaux précieux',0],
["B070202",'Extraction d\'autres minerais de métaux non ferreux',0],
["B0801",'EXTRACTION DE PIERRES, DE SABLES ET D\'ARGILES',1],
["B080100",'Extraction de pierres, de sables et d\'argiles',0],
["B0802",'ACTIVITES EXTRACTIVES N.C.A.',1],
["B080201",'Extraction de phosphates et de sels de potassium, naturels',0],
["B080202",'Extractions de minéraux pour l\'industrie chimique',0],
["B080203",'Extraction ou production de sel et de natron',0],
["B080204",'Extraction de pierres précieuses et semi-précieuses',0],
["B080205",'Autres extractions',0],
["B0901",'ACTIVITES DE SOUTIEN A L’EXTRACTION D’HYDROCARBURES',1],
["B090100",'Activités de soutien à l’extraction d’hydrocarbures',0],
["B0902",'ACTIVITES DE SOUTIEN AUX AUTRES INDUSTRIES EXTRACTIVES',1],
["B090200",'Activités de soutien aux autres industries extractives',0],
["C1001",'ABATTAGE, TRANSFORMATION ET CONSERVATION DE LA VIANDE ET PREPARATION DE PRODUITS A BASE DE VIANDE',1],
["C100101",'Abattage, Transformation et conservation de la viande',0],
["C100102",'Préparation de produits à base de viande',0],
["C1002",'TRANSFORMATION ET CONSERVATION DE POISSONS, CRUSTACES ET MOLLUSQUES',1],
["C100201",'Congélation de poissons, crustacés et mollusques',0],
["C100202",'Séchage, salage ou fumage du poisson',0],
["C100203",'Autres transformation et conservation des poissons, crustacés et mollusques',0],
["C1003",'TRANSFORMATION ET CONSERVATION DE FRUITS ET LEGUMES',1],
["C100300",'Transformation et conservation de fruits et légumes',0],
["C1004",'FABRICATION DE CORPS GRAS D\'ORIGINE ANIMALE ET VEGETALE',1],
["C100400",'Fabrication de corps gras d\'origine animale et végétale',0],
["C1005",'TRAVAIL DES GRAINS ; FABRICATION DE PRODUITS AMYLACES',1],
["C100501",'Travail des grains',0],
["C100502",'Transformation du manioc et fabrication de produits amylacés',0],
["C1006",'FABRICATION DE PRODUITS ALIMENTAIRES A BASE DE CEREALES N.C.A.',1],
["C100601",'Fabrication de pain et de pâtisseries fraîches',0],
["C100602",'Biscuiterie et pâtisserie de conservation',0],
["C100603",'Fabrication de pâtes alimentaires, de semoules et de produits farineux similaires',0],
["C1007",'TRANSFORMATION DU CACAO ET DU CAFÉ',1],
["C100701",'Transformation du cacao',0],
["C100702",'Transformation du café',0],
["C1008",'FABRICATION D’AUTRES PRODUITS ALIMENTAIRES',1],
["C100801",'Fabrication de produits laitiers et de glaces',0],
["C100802",'Fabrication de sucre et de confiserie',0],
["C100803",'Fabrication de thé',0],
["C100804",'Fabrication de condiments et assaisonnements',0],
["C100805",'Fabrication d’aliments pour animaux',0],
["C100806",'Fabrication de denrées diverses n.c.a.',0],
["C1101",'FABRICATION DE BOISSONS ALCOOLISÉES',1],
["C110101",'Fabrication de malt et de  bière',0],
["C110102",'Fabrication d\'autres boissons alcoolisées',0],
["C1102",'FABRICATION DE BOISSONS NON ALCOOLISES ET D\'EAUX MINERALES',1],
["C110200",'Fabrication de boissons non alcoolises et d\'eaux minérales',0],
["C1200",'FABRICATION DE PRODUITS A BASE DE TABAC',1],
["C120000",'Fabrication de produits à base de tabac',0],
["C1301",'FILATURE, TISSAGE ET ENNOBLISSEMENT DE TEXTILE',1],
["C130101",'Filature de textile',0],
["C130102",'Tissage de textile',0],
["C130103",'Ennoblissement de textile',0],
["C1302",'FABRICATION D\'AUTRES ARTICLES TEXTILES',1],
["C130201",'Fabrication de tapis et moquettes',0],
["C130202",'Fabrication d\'étoffes à mailles et d\'articles textiles non vestimentaires',0],
["C1401",'FABRICATION DE VETEMENTS',1],
["C140100",'Fabrication de vêtements',0],
["C1402",'SERVICE DE COUTURE  SUR MESURE',1],
["C140200",'Service de couture sur mesure',0],
["C1501",'TRAVAIL DU CUIR; FABRICATION D\'ARTICLES DE VOYAGE',1],
["C150101",'Apprêt, tannage des cuirs et fourrures',0],
["C150102",'Fabrication d\'articles de voyage, de maroquinerie et de sellerie',0],
["C1502",'FABRICATION DE CHAUSSURES ET ARTICLES CHAUSSANTS',1],
["C150200",'Fabrication de chaussures et articles chaussants',0],
["C1601",'TRAVAIL DU BOIS',1],
["C160100",'Sciage, Rabotage',0],
["C1602",'FABRICATION D\'ARTICLES EN BOIS, LIEGE, VANNERIE ET SPARTERIE',1],
["C160201",'Fabrication de feuilles de placage, de contreplaques et de panneaux',0],
["C160202",'Fabrication d\'ouvrages de charpente,  de menuiseries et d\'emballages en bois',0],
["C160203",'Fabrication d\'articles divers en bois ou liège, vannerie et sparterie',0],
["C17",'FABRICATION DE PAPIER, CARTONS ET D’ARTICLES EN PAPIER OU EN CARTON',1],
["C1700",'FABRICATION DE PAPIER, CARTONS ET D’ARTICLES EN PAPIER OU EN CARTON',1],
["C170001",'Fabrication de pâte a papier, de papier et de carton',0],
["C170002",'Fabrication de carton ondulé et emballages en papier ou en carton',0],
["C170003",'Fabrication d\'articles en papier ou en carton',0],
["C1801",'IMPRIMERIE ET ACTIVITES CONNEXES',1],
["C180100",'Imprimerie et activités connexes',0],
["C1802",'REPRODUCTION D\'ENREGISTREMENTS',1],
["C180200",'Reproduction d\'enregistrement',0],
["C1901",'RAFFINAGE DU PETROLE',1],
["C190100",'Raffinage du pétrole',0],
["C1902",'COKEFACTION',1],
["C190200",'Cokéfaction',0],
["C2001",'FABRICATION DE PRODUITS CHIMIQUES DE BASE',1],
["C200101",'Fabrication de produits azotés et d\'engrais',0],
["C200102",'Fabrication d\'autres produits chimiques  de base',0],
["C2002",'FABRICATION DE PRODUITS CHIMIQUES FONCTIONNELS',1],
["C200201",'Fabrication de savons, détergents et produits d\'entretien',0],
["C200202",'Fabrication de parfums et de produits de toilette',0],
["C200203",'Fabrication de produits agrochimiques',0],
["C200204",'Fabrication de peintures et vernis, adjuvants et encres d\'imprimerie',0],
["C200205",'Fabrication de fibres artificielles ou synthétiques',0],
["C200206",'Fabrication d\'autres produits chimiques',0],
["C2100",'FABRICATION DE PRODUITS PHARMACEUTIQUES',1],
["C210001",'Industrie pharmaceutique',0],
["C210002",'Fabrication de médicaments traditionnels',0],
["C2201",'TRAVAIL DU CAOUTCHOUC',1],
["C220101",'Fabrication et rechapage de pneumatiques',0],
["C220102",'Fabrication d\'autres articles en caoutchouc',0],
["C2202",'TRAVAIL DU PLASTIQUE',1],
["C220200",'Fabrication d\'articles en plastique',0],
["C2301",'FABRICATION DE VERRE ET D\'ARTICLES EN VERRE',1],
["C230100",'Fabrication de verre et d\'articles en verre',0],
["C2302",'FABRICATION DE PRODUITS CÉRAMIQUES',1],
["C230201",'Fabrication de carreaux en céramique',0],
["C230202",'Fabrication de tuiles et briques',0],
["C230203",'Fabrication d\'autres produits céramiques',0],
["C2303",'FABRICATION DE CIMENTS ET AUTRES PRODUITS MINERAUX',1],
["C230301",'Fabrication de ciment, chaux et plâtre',0],
["C230302",'Fabrication de matériaux et d\'ouvrages en ciment, en béton ou en plâtre ;  Travail de  la  pierre',0],
["C230303",'Fabrication de produits minéraux non métalliques n.c.a.',0],
["C2401",'SIDERURGIE ET PREMIERE TRANSFORMATION DE L\'ACIER',1],
["C240100",'Sidérurgie et première transformation de l\'acier',0],
["C2402",'METALLURGIE ET PREMIERE TRANSFORMATION DES METAUX NON FERREUX',1],
["C240200",'Métallurgie et première transformation des métaux non ferreux',0],
["C2403",'FONDERIE',1],
["C240300",'Fonderie',0],
["C2501",'FABRICATION DE STRUCTURES METALLIQUES, CITERNES ET OUVRAGES CHAUDRONNES',1],
["C250100",'Fabrication de structures métalliques, citernes et ouvrages chaudronnés',0],
["C2502",'FABRICATION D\'AUTRES OUVRAGES EN METAUX; TRAVAIL DES METAUX',1],
["C250200",'Fabrication d\'autres ouvrages en métaux; travail des métaux',0],
["C2601",'FABRICATION DE COMPOSANTS ELECTRONIQUE, D\'ORDINATEURS ET DE PERIPHERIQUES',1],
["C260101",'Fabrication de composants, cartes électroniques et supports magnétiques',0],
["C260102",'Fabrication d\'ordinateurs et d\'équipements périphériques',0],
["C2602",'FABRICATION D\'EQUIPEMENTS DE COMMUNICATION ET DE PRODUITS ELECTRONIQUES GRAND PUBLICS',1],
["C260201",'Fabrication d\'équipements de communication',0],
["C260202",'Fabrication de produits électroniques grand public',0],
["C2603",'FABRICATION D\'EQUIPEMENTS D\'IMAGERIE MEDICALE, DE PRECISION, D\'OPTIQUE ET D\'HORLOGERIE',1],
["C260300",'Fabrication d\'équipements d\'imagerie médicale, de précision, d\'optique et d\'horlogerie',0],
["C2701",'FABRICATION DE MACHINES ET MATERIELS ELECTROTECHNIQUES',1],
["C270100",'Fabrication de machines et matériels électrotechniques',0],
["C2702",'FABRICATION D\'APPAREILS DOMESTIQUES',1],
["C270200",'Fabrication d\'appareils domestiques',0],
["C2703",'FABRICATION D’AUTRES MATERIELS ELECTRIQUES',1],
["C270300",'Fabrication d’autres matériels électriques',0],
["C2801",'FABRICATION DE MACHINES D\'USAGE GÉNÉRAL',1],
["C280100",'Fabrication de machines d\'usage général',0],
["C2802",'FABRICATION DE MACHINES D\'USAGE SPÉCIFIQUE',1],
["C280200",'Fabrication de machines d\'usage spécifique',0],
["C2900",'CONSTRUCTION DE VÉHICULES AUTOMOBILES',1],
["C290000",'Construction de véhicules automobiles',0],
["C3001",'CONSTRUCTION NAVALE, AÉRONAUTIQUE ET FERROVIAIRE',1],
["C300101",'construction navale',0],
["C300102",'Construction aéronautique',0],
["C300103",'Construction ferroviaire',0],
["C300104",'Construction de véhicules militaires de combat',0],
["C3002",'FABRICATION D\'AUTRES EQUIPEMENTS DE TRANSPORT',1],
["C300200",'Fabrication d\'autres équipements de transport',0],
["C3100",'FABRICATION DE MEUBLES ET MATELAS',1],
["C310001",'Fabrication de matelas et sommiers',0],
["C310002",'Fabrication de meubles',0],
["C3200",'AUTRES INDUSTRIES',1],
["C320001",'Fabrication de bijoux',0],
["C320002",'Fabrication d\'instruments de musique',0],
["C320003",'Activités manufacturières n.c.a',0],
["C3301",'REPARATION DE MACHINES ET D\'EQUIPEMENTS PROFESSIONNELS',1],
["C330100",'Réparation de machines et d\'équipements professionnels',0],
["C3302",'INSTALLATION DE MACHINES ET D\'EQUIPEMENTS PROFESSIONNELS',1],
["C330200",'Installation de machines et d\'équipements professionnels',0],
["D3501",'PRODUCTION, TRANSPORT ET DISTRIBUTION D\'ÉLECTRICITÉ',1],
["D350100",'Production, transport et distribution d\'électricité',0],
["D3502",'PRODUCTION ET DISTRIBUTION DE COMBUSTIBLES GAZEUX ET DE GLACE',1],
["D350200",'Production et distribution de combustibles gazeux et de glace',0],
["E3600",'CAPTAGE, TRAITEMENT ET DISTRIBUTION D\'EAU',1],
["E360000",'Captage, traitement et distribution d\'eau',0],
["E3700",'COLLECTE ET TRAITEMENT DES EAUX USEES',1],
["E370000",'Collecte et traitement des eaux usées',0],
["E3800",'COLLECTE, TRAITEMENT ET ELIMINATION DES DECHETS ; RECUPERATION',1],
["E380001",'Collecte, traitement et élimination des déchets',0],
["E380002",'Récupération',0],
["E3900",'DEPOLLUTION ET GESTION DES DECHETS',1],
["E390000",'Dépollution et gestion des déchets',0],
["F4300",'ACTIVITÉS SPECIALISEES DE CONSTRUCTION',1],
["F430001",'Démolition et préparation des sites',0],
["F430002",'Travaux d\'installation',0],
["F430003",'Travaux de finition',0],
["F430004",'Autres travaux spécialisés de construction',0],
["G4501",'COMMERCE DE VÉHICULES AUTOMOBILES',1],
["G450100",'Commerce de véhicules automobiles',0],
["G4502",'ENTRETIEN ET REPARATION DE VEHICULES AUTOMOBILES',1],
["G450200",'Entretien et réparation de véhicules automobiles',0],
["G4503",'COMMERCE DE PIECES DETACHEES ET D\'ACCESSOIRES AUTOMOBILES',1],
["G450300",'Commerce de pièces détachées et d\'accessoires automobiles',0],
["G4504",'COMMERCE ET RÉPARATION DE MOTOCYCLES',1],
["G450400",'Commerce et réparation de motocycles',0],
["G4601",'ACTIVITES DES INTERMEDIAIRES DU COMMERCE DE GROS',1],
["G460100",'Activités des Intermédiaires du commerce de gros',0],
["G4602",'COMMERCE DE GROS DE PRODUITS AGRICOLES BRUTS, D\'ANIMAUX VIVANTS, PRODUITS ALIMENTAIRES, BOISSONS ET TABAC',1],
["G460201",'Commerce de gros de produits agricoles bruts et d\'aliments pour animaux',0],
["G460202",'Commerce de gros d\'animaux vivants, de peaux et cuirs',0],
["G460203",'Commerce de gros de produits alimentaires, boissons et tabacs manufacturés',0],
["G4603",'COMMERCE DE GROS DE BIENS DE CONSOMMATION NON ALIMENTAIRES',1],
["G460301",'Commerce de gros de textiles, habillement et chaussures',0],
["G460302",'Commerce de gros de produits pharmaceutiques et médicaux',0],
["G460303",'Commerce de gros de biens de consommation non alimentaires divers',0],
["G4604",'COMMERCE DE GROS DE PRODUITS INTERMEDIAIRES NON AGRICOLES',1],
["G460401",'Commerce de gros de carburants et combustibles',0],
["G460402",'Commerce de gros de bois',0],
["G460403",'Commerce de gros de matériaux de construction, quincaillerie et fournitures pour plomberie',0],
["G460404",'Commerce de gros d’autres produits intermédiaires non agricoles',0],
["G4605",'COMMERCE DE GROS DE MACHINES, D\'EQUIPEMENTS ET FOURNITURES',1],
["G460501",'Commerce de gros de machines, d\'équipements et fournitures',0],
["G460502",'Commerce de gros d\'autres équipements industriels et fournitures diverses',0],
["G4606",'COMMERCE DE GROS NON SPÉCIALISÉ',1],
["G460600",'Commerce de gros non spécialisé',0],
["G4701",'COMMERCE DE DETAIL EN MAGASIN NON SPECIALISE',1],
["G470100",'Commerce de détail en magasin non spécialisé',0],
["G4702",'COMMERCE DE DETAIL EN MAGASIN SPECIALISE',1],
["G470201",'Commerce de détail en magasin spécialisé de produits alimentaires, boissons et tabacs manufacturés',0],
["G470202",'Commerce de détail en magasin spécialisé de produits pharmaceutiques et médicaux, de parfumerie et de produits de beauté',0],
["G470203",'Commerce de détail en magasin spécialisé de textiles, habillement, chaussures et articles en cuir',0],
["G470204",'Commerce de détail en magasin spécialisé d\'articles et appareils d\'équipement domestique',0],
["G470205",'Commerce de détail en magasin spécialisé de quincaillerie, peintures, verre, tapis et revêtement de sols et murs',0],
["G470206",'Commerce de détail en magasin spécialisé de livres, journaux et articles de sport et de loisirs',0],
["G470207",'Commerce de détail en magasin spécialisé d\'équipements informatiques et de matériels de télécommunication, audio ou vidéo',0],
["G470208",'Commerce de détail en magasin spécialisé de carburants automobiles',0],
["G470209",'Commerce de détail en magasin spécialisé d\'autres produits n.c.a.',0],
["G4703",'COMMERCE DE DÉTAIL HORS MAGASIN',1],
["G470301",'Commerce de détail sur éventaires et marchés de viandes et poissons',0],
["G470302",'Commerce de détail sur éventaires et marchés de fruits et légumes frais',0],
["G470303",'Commerce de détail sur éventaires et marchés de céréales, tubercules et d\'autres produits alimentaires, boissons et tabacs manufacturés',0],
["G470304",'Commerce de détail sur éventaires et marchés de textiles, habillement, chaussures et articles en cuir',0],
["G470305",'Commerce de détail sur éventaires et marchés d\'articles non alimentaires divers',0],
["G470306",'Autres commerces de détail hors magasin',0],
["H4901",'TRANSPORTS FERROVIAIRES',1],
["H490100",'Transports ferroviaires',0],
["H4902",'TRANSPORTS ROUTIERS',1],
["H490201",'Transports routiers de passagers',0],
["H490202",'Transports routiers de marchandises',0],
["H4903",'TRANSPORTS PAR CONDUITES',1],
["H490300",'Transports par conduites',0],
["H50",'TRANSPORT PAR EAU',1],
["H5001",'TRANSPORTS MARITIMES ET CÔTIERS',1],
["H500100",'Transports maritimes et côtiers',0],
["H5002",'TRANSPORTS FLUVIAUX',1],
["H500200",'Transports fluviaux',0],
["H51",'TRANSPORTS AÉRIENS',1],
["H5100",'TRANSPORTS AÉRIENS',1],
["H510001",'Transports aériens de passagers',0],
["H510002",'Transports aériens de fret et transports spatiaux',0],
["H5201",'ENTREPOSAGE',1],
["H520100",'Entreposage',0],
["H5202",'ACTIVITÉS AUXILIAIRES DES TRANSPORTS',1],
["H520201",'Manutention',0],
["H520202",'Exploitation d\'infrastructures de transport',0],
["H520203",'Organisation du transport de fret',0],
["H5300",'ACTIVITES DE POSTE ET DE COURRIER',1],
["H530001",'Activités de service postal universel',0],
["H530002",'Autres activités de courrier et de distribution',0],
["I5500",'HEBERGEMENT',1],
["I550000",'Hébergement',0],
["I5601",'RESTAURATION',1],
["I560100",'Restauration',0],
["I5602",'ACTIVITÉS DES DÉBITS DE BOISSONS',1],
["I560200",'Activités des débits de boissons',0],
["J5801",'ÉDITION DE LIVRES ET PERIODIQUES ET AUTRES ACTIVITES D\'EDITION',1],
["J580100",'Édition de livres et périodiques',0],
["J5802",'ÉDITION DE LOGICIELS',1],
["J580200",'Édition de logiciels',0],
["J5901",'PRODUCTION VIDÉO : CINÉMA ET TÉLÉVISION',1],
["J590100",'Production vidéo : cinéma et télévision',0],
["J5902",'PRODUCTION AUDIO ET ÉDITION MUSICALE',1],
["J590200",'Production audio et édition musicale',0],
["J6000",'PROGRAMMATION TÉLÉVISUELLE ; RADIODIFFUSION',1],
["J600001",'Édition et diffusion de programmes radio',0],
["J600002",'Programmation télévisuelle; Télédiffusion',0],
["J6100",'TÉLÉCOMMUNICATIONS',1],
["J610000",'Télécommunications',0],
["J6200",'ACTIVITÉS INFORMATIQUES : CONSEIL, PROGRAMMATION',1],
["J620001",'Programmation informatique',0],
["J620002",'Conseil et autres activités informatiques',0],
["J6300",'ACTIVITÉS DE FOURNITURE D\'INFORMATION',1],
["J630001",'Traitement de données, hébergement et activités connexes ; Création de portails Internet',0],
["J630002",'Autres activités liées à l\'information',0],
["K6401",'INTERMÉDIATION MONÉTAIRE',1],
["K640101",'Activités de banque centrale',0],
["K640102",'Autres intermédiations monétaires (Banques commerciales)',0],
["K6402",'ACTIVITES DES FONDS DE PLACEMENTS, HOLDINGS ET SIMILAIRES',1],
["K640200",'Activités des fonds de placements, holdings et similaires',0],
["K6403",'ACTIVITES DE CREDITS ET AUTRES INTERMEDIATIONS NON MONETAIRES',1],
["K640301",'Activités de micro finance',0],
["K640302",'Autres activités de crédits et autres intermédiations non monétaires',0],
["K6500",'ASSURANCE',1],
["K650001",'Assurance vie et caisses de retraite',0],
["K650002",'Assurance dommage et réassurance',0],
["K66",'ACTIVITÉS D\'AUXILIAIRES FINANCIERS ET D\'ASSURANCE',1],
["K6600",'ACTIVITÉS D\'AUXILIAIRES FINANCIERS ET D\'ASSURANCE',1],
["K660001",'Gestion de Fonds pour tiers',0],
["K660002",'Activités de transfert  de fonds et d’auxiliaires financiers',0],
["K660003",'Activités d\'auxiliaires d\'assurance',0],
["L6801",'LOCATION IMMOBILIERE ET ACTIVITES SUR BIENS PROPRES',1],
["L680100",'Location immobilière et activités sur biens propres',0],
["L6802",'ACTIVITÉS DES AGENCES IMMOBILIÈRES',1],
["L680200",'Activités des agences immobilières',0],
["M6901",'ACTIVITÉS JURIDIQUES',1],
["M690100",'Activités juridiques',0],
["M6902",'ACTIVITÉS COMPTABLES',1],
["M690200",'Activités comptables',0],
["M7000",'ACTIVITÉS DES SIEGES SOCIAUX; CONSEIL EN GESTION',1],
["M700001",'Activités des sièges sociaux',0],
["M700002",'Conseil de gestion',0],
["M7100",'ACTIVITÉS D\'ARCHITECTURE, D\'INGENIERIE ET TECHNIQUES',1],
["M710001",'Activités d’architecture et d\'ingénierie',0],
["M710002",'Activités de contrôle et analyses techniques',0],
["M7201",'RECHERCHE-DEVELOPPEMENT EN SCIENCES PHYSIQUES ET NATURELLES',1],
["M720100",'Recherche-développement en sciences physiques et naturelles',0],
["M7202",'RECHERCHE-DEVELOPPEMENT EN SCIENCES HUMAINES ET SOCIALES',1],
["M720200",'Recherche-développement en sciences humaines et sociales',0],
["M7300",'PUBLICITE ET ETUDES DE MARCHES',1],
["M730001",'Publicité',0],
["M730002",'Études de marché et sondages',0],
["M74",'AUTRES ACTIVITÉS PROFESSIONNELLES DE SERVICES SPECIALISES',1],
["M7400",'AUTRES ACTIVITES SPECIALISEES SCIENTIFIQUES ET TECHNIQUES',1],
["M740001",'Activités spécialisées de design',0],
["M740002",'Activités photographiques',0],
["M740003",'Autres activités spécialisées, scientifiques et techniques n.c.a.',0],
["M75",'ACTIVITÉS VETERINAIRES',1],
["M7500",'ACTIVITÉS VETERINAIRES',1],
["M750000",'Activités vétérinaires',0],
["N7700",'LOCATION ET LOCATION-BAIL',1],
["N770001",'Location de véhicules automobiles',0],
["N770002",'Location de machines et d\'équipements n.c.a.',0],
["N770003",'Location d\'articles personnels et domestiques n.c.a.',0],
["N770004",'Gestion des droits de propriété industrielle',0],
["N7800",'ACTIVITES LIEES AUX RESSOURCES HUMAINES',1],
["N780000",'Activités liées aux ressources humaines',0],
["N7900",'ACTIVITÉS DES AGENCES DE RESERVATION ET VOYAGISTES',1],
["N790000",'Activités des agences de réservation et voyagistes',0],
["N8000",'ENQUETES ET SECURITE',1],
["N800000",'Enquêtes et sécurité',0],
["N8100",'SOUTIEN AUX BATIMENTS ; AMENAGEMENT PAYSAGER',1],
["N810001",'Activités combinées de soutien aux bâtiments',0],
["N810002",'Activités de nettoyage',0],
["N810003",'Aménagement paysager',0],
["N8200",'ACTIVITES DE SOUTIEN AUX ENTREPRISES ; ACTIVITES DE BUREAU',1],
["N820001",'Activités de bureau, routage et centres d\'appels',0],
["N820002",'Organisation de foires, salons et congrès',0],
["N820003",'Activités de soutien aux entreprises n.c.a.',0],
["O8401",'ACTIVITES D\'ADMINISTRATION GENERALE, ECONOMIQUE ET SOCIALE',1],
["O840100",'Activités d\'administration générale, économique et sociale',0],
["O8402",'ACTIVITÉS DE PRÉROGATIVE PUBLIQUE',1],
["O840200",'Activités de prérogative publique',0],
["O8403",'ACTIVITÉS DE SÉCURITÉ SOCIALE OBLIGATOIRE',1],
["O840300",'Activités de sécurité sociale obligatoire',0],
["P8501",'ENSEIGNEMENT PRÉ-PRIMAIRE ET PRIMAIRE',1],
["P850100",'Enseignement pré-primaire et primaire',0],
["P8502",'ENSEIGNEMENT SECONDAIRE',1],
["P850201",'Enseignement secondaire général',0],
["P850202",'Enseignement secondaire technique ou professionnel',0],
["P8503",'ENSEIGNEMENT SUPERIEUR ET POST-SECONDAIRE NON SUPERIEUR',1],
["P850301",'Enseignement supérieur',0],
["P850302",'Enseignement post-secondaire non supérieur',0],
["P8504",'AUTRES ACTIVITÉS D\'ENSEIGNEMENT',1],
["P850400",'Autres activités d\'enseignement',0],
["Q8601",'ACTIVITÉS HOSPITALIÈRES',1],
["Q860100",'Activités hospitalières',0],
["Q8602",'ACTIVITE DES MEDECINS ET DES DENTISTES',1],
["Q860200",'Activité des médecins et des dentistes',0],
["Q8603",'ACTIVITÉS PARAMÉDICALES ET DE SOUTIEN',1],
["Q860301",'Activités des tradipraticiens',0],
["Q860302",'Autres activités pour la santé humaine',0],
["Q8700",'ACTIVITES D\'HEBERGEMENT MEDICO-SOCIAL ET SOCIAL',1],
["Q870000",'Activités d\'Hébergement médico-social et social',0],
["Q8800",'ACTION SOCIALE SANS HEBERGEMENT',1],
["Q880000",'Action sociale sans hébergement',0],
["R9000",'ACTIVITES CREATIVES, ARTISTIQUES ET DE SPECTACLE',1],
["R900000",'Activités créatives, artistiques et de spectacle',0],
["R9100",'CONSERVATION ET VALORISATION DU PATRIMOINE',1],
["R910000",'Conservation et valorisation du patrimoine',0],
["R9200",'ORGANISATION DE JEUX DE HASARD ET D\'ARGENT',1],
["R920000",'Organisation de jeux de hasard et d\'argent',0],
["R9301",'ACTIVITÉS LIÉES AU SPORT',1],
["R930100",'Activités liées au sport',0],
["R9302",'ACTIVITÉS RÉCRÉATIVES ET DE LOISIRS',1],
["R930200",'Activités récréatives et de loisirs',0],
["S9401",'ACTIVITES DES ORGANISATIONS ECONOMIQUES, PATRONALES ET PROFESSIONNELLES',1],
["S940100",'Activités des organisations économiques, patronales et professionnelles',0],
["S9402",'ACTIVITÉS DES SYNDICATS DES TRAVAILLEURS',1],
["S940200",'Activités des syndicats des travailleurs',0],
["S9403",'ACTIVITÉS DES AUTRES ORGANISATIONS ASSOCIATIVES',1],
["S940301",'Activités des organisations religieuses',0],
["S940302",'Activités des organisations politiques',0],
["S940303",'Activités des autres organisations associatives',0],
["S9501",'REPARATION D\'ORDINATEURS ET D\'EQUIPEMENTS DE COMMUNICATION',1],
["S950101",'Réparation d\'ordinateurs et d\'équipements périphériques',0],
["S950102",'Réparation d\'équipements de communication',0],
["S9502",'REPARATION DE BIENS PERSONNELS ET DOMESTIQUES',1],
["S950200",'Réparation de biens personnels et domestiques',0],
["S9600",'FOURNITURE D\'AUTRES SERVICES PERSONNELS',1],
["S960001",'Lavage et nettoyage de textiles',0],
["S960002",'Coiffure et soins de beauté',0],
["S960003",'Services funéraires',0],
["S960004",'Autres services personnels n.c.a',0],
["T9700",'ACTIVITÉS DES MÉNAGES EN TANT QU’EMPLOYEURS DE PERSONNEL DOMESTIQUE',1],
["T970000",'Activités des ménages en tant qu\'employeurs de personnel domestique',0],
["T9800",'ACTIVITÉS INDIFFERENCIEES AUTOPRODUITES DES MÉNAGES',1],
["T980001",'Activités indifférenciées des ménages en tant que producteurs de biens pour usage propre',0],
["T980002",'Activités indifférenciées des ménages en tant que producteurs de services pour usage propre',0],
["U9900",'ACTIVITÉS DES ORGANISATIONS EXTRATERRITORIALES',1],
["U990000",'Activités des organisations extraterritoriales',0]
];
function liasseRenderNote36Nomenclature(){
    return '<div class="alert alert-info" style="margin-bottom:10px;">Sélectionnez le ou les codes activités correspondant au découpage du chiffre d\'affaires de l\'entité pour renseigner le tableau "Activité de l\'entreprise" de la <strong>FICHE R2</strong>. Seule(s) la/les page(s) où figurent les codes réellement utilisés doivent être jointes à la liasse fiscale.</div>'+
        '<input type="text" id="note36-ciap-search" placeholder="🔎 Rechercher un code ou une activité (ex. G4702, transport, commerce...)" '+
        'oninput="liasseFilterCiap()" style="width:100%;max-width:520px;padding:8px 10px;margin-bottom:12px;border:1px solid #ccc;border-radius:4px;font-size:13px;">'+
        '<div id="note36-ciap-count" style="font-size:11px;color:#888;margin-bottom:8px;"></div>'+
        '<table class="liasse-table" id="note36-ciap-table"><thead><tr><th style="width:110px;">Code Activité</th><th>Activités</th></tr></thead>'+
        '<tbody id="note36-ciap-tbody">'+liasseCiapRows(NOTE36_CIAP)+'</tbody></table>';
}
function liasseCiapRows(list){
    return list.map(function(e){
        var code=e[0], label=e[1], isHeader=e[2];
        var style = isHeader ? ' style="background:#f4f1ea;font-weight:700;color:#1B2A4A;"' : '';
        return '<tr'+style+'><td>'+code+'</td><td>'+label+'</td></tr>';
    }).join('');
}
function liasseFilterCiap(){
    var q = (document.getElementById('note36-ciap-search').value || '').trim().toLowerCase();
    var tbody = document.getElementById('note36-ciap-tbody');
    var countEl = document.getElementById('note36-ciap-count');
    if(!q){
        tbody.innerHTML = liasseCiapRows(NOTE36_CIAP);
        countEl.textContent = NOTE36_CIAP.length + ' lignes affichées (nomenclature complète).';
        return;
    }
    var filtered = NOTE36_CIAP.filter(function(e){
        return e[0].toLowerCase().indexOf(q) !== -1 || e[1].toLowerCase().indexOf(q) !== -1;
    });
    tbody.innerHTML = filtered.length ? liasseCiapRows(filtered) : '<tr><td colspan="2" style="text-align:center;color:#999;padding:16px;">Aucun résultat pour « '+q+' ».</td></tr>';
    countEl.textContent = filtered.length + ' résultat(s) pour « ' + q + ' ».';
}

var COMP_CHARGES_STRUCT=[
['6011','Achats de marchandises dans la région',0],
['6012','Achats de marchandises hors région',0],
['6013','Achats de marchandises aux entités du groupe dans la région',0],
['6014','Achats de marchandises aux entités du groupe hors région',0],
['6015','Frais sur achats',0],
['6019','Rabais, remises et ristournes obtenus (non ventilés)',0],
['RA','Achats de marchandises',1],
['6031','Variation des stocks de marchandises',0],
['RB','Variation de stocks',1],
['6021','Achats de matières premières et fournitures liées dans la région',0],
['6022','Achats de matières premières et fournitures liées hors région',0],
['6023','Achats de matières premières et fournitures liées aux entités du groupe dans la région',0],
['6024','Achats de matières premières et fournitures liées aux entités du groupe hors région',0],
['6025','Frais sur achats',0],
['6029','Rabais, remises et ristournes obtenus (non ventilés)',0],
['RC','Achats de matières premières et fournitures liées',1],
['6032','Variation des stocks de matières premières et fournitures liées',0],
['RD','Variation de stocks de matières premières',1],
['6041','Matières consommables',0],
['6042','Matières combustibles',0],
['6043','Produits d\'entretien',0],
['6044','Fournitures d\'atelier et d\'usine',0],
['6045','Frais sur achats',0],
['6046','Fournitures de magasin',0],
['6047','Fournitures de bureau',0],
['6049','Rabais, remises et ristournes obtenus (non ventilés)',0],
['6051','Fournitures non stockables-Eau',0],
['6052','Fournitures non stockables-Electricité',0],
['6053','Fournitures non stockables-Autres énergies',0],
['6054','Fournitures d\'entretien non stockables',0],
['6055','Fournitures de bureau non stockables',0],
['6056','Achats de petit matériel et outillage',0],
['6057','Achats d\'études et prestations de services',0],
['6058','Achats de travaux, matériels et équipements',0],
['6059','Rabais, remises et ristournes obtenus (non ventilés)',0],
['6081','Emballages perdus',0],
['6082','Emballages récupérables non identifiables',0],
['6083','Emballages à usage mixte',0],
['6085','Frais sur achats',0],
['6089','Rabais, remises et ristournes obtenus (non ventilés)',0],
['RE','Autres achats',1],
['6033','Variation des stocks d\'autres approvisionnements',0],
['RF','Variation de stocks d\'autres approvisionnements',1],
['612','Transports sur ventes',0],
['613','Transports pour le compte de tiers',0],
['614','Transports du personnel',0],
['616','Transports de plis',0],
['6181','Voyages et déplacements',0],
['6182','Transports entre établissements et chantiers',0],
['6183','Transports administratifs',0],
['619','Rabais, remises et ristournes obtenus (non ventilés)',0],
['RG','Transports',1],
['621','Sous-traitance générale',0],
['6221','Location de terrains',0],
['6222','Location de bâtiments',0],
['6223','Location de matériels et outillages',0],
['6224','Malis sur emballages',0],
['6225','Locations d\'emballages',0],
['6226','Fermages et loyers du foncier',0],
['6228','Locations  et charges locatives diverses',0],
['6232','Crédit-bail immobilier',0],
['6233','Crédit-bail mobilier',0],
['6234','Location-vente',0],
['6238','Autres contrats de location-acquisition',0],
['6241','Entretien et réparation des biens immobiliers',0],
['6242','Entretien et réparation des biens mobiliers',0],
['6243','Maintenance',0],
['6244','Charges de démentellement et remise en état',0],
['6248','Autre entretiens et réparation',0],
['6251','Assurances multirisques ',0],
['6252','Assurances matériels de transport',0],
['6253','Assurances risques d\'exploitation',0],
['6254','Assurances responsabilité du producteur',0],
['6255','Assurances insolvabilité clients',0],
['6257','Assurances transport sur ventes',0],
['6258','Autres primes d\'assurances',0],
['6261','Etudes et recherches',0],
['6265','Documentation générale',0],
['6266','Documentation technique',0],
['6271','Annonces, insertions',0],
['6272','Catalogues, imprimés publicitaires',0],
['6273','Échantillons',0],
['6274','Foires et expositions',0],
['6275','Publications',0],
['6276','Cadeaux à la clientèle',0],
['6277','Frais de colloques, séminaires, conférences',0],
['6278','Autres charges de publicité et relations publiques',0],
['6281','Frais de téléphone',0],
['6282','Frais de télex',0],
['6283','Frais de télécopie',0],
['6284','Frais d\'internet',0],
['6288','Autres frais de télécommunications',0],
['6311','Frais sur titres (vente, garde)',0],
['6312','Frais sur effets',0],
['6313','Location de coffres',0],
['6314','Commissions d\'affacturage et de titrisation',0],
['6315','Commissions sur cartes de crédit',0],
['6316','Frais d\'émission d\'emprunts',0],
['6317','Frais sur instruments monnaie électronique',0],
['6318','Autres frais bancaires',0],
['6322','Commissions et courtages sur ventes',0],
['6324','Honoraires des professions règlementées',0],
['6325','Frais d\'actes et de contentieux',0],
['6326','Rémunérations d\'affacturage et de titrisation',0],
['6327','Rémunérations des autres prestataires de services',0],
['6328','Divers frais',0],
['633','Frais de formation du personnel',0],
['6342','Redevances pour brevets, licences',0],
['6343','Redevances pour logiciels',0],
['6344','Redevances pour marques',0],
['6345','Redevances pour sites internet',0],
['6346','Redevances pour concessions, droits et valeurs similaires',0],
['6351','Cotisations',0],
['6358','Concours divers',0],
['6371','Personnel intérimaire',0],
['6372','Personnel détaché ou prêté à l\'entité',0],
['6381','Frais de recrutement du personnel',0],
['6382','Frais de déménagement',0],
['6383','Réceptions',0],
['6384','Missions',0],
['6385','Charges de copropriété',0],
['6388','Charges externes diverses',0],
['RH','Services extérieurs',1],
['6411','Impôts fonciers et taxes annexes',0],
['6412','Patentes, licences et taxes annexes',0],
['6413','Taxes sur appointements et salaires',0],
['6414','Taxes d\'apprentissage',0],
['6415','Formation professionnelle continue',0],
['6418','Autres impôts et taxes directs',0],
['645','Impôts et taxes indirects',0],
['6461','Droits de mutation',0],
['6462','Droits de timbre',0],
['6463','Taxes sur les véhicules de société',0],
['6464','Vignettes',0],
['6468','Autres droits d\'enregistrement',0],
['6471','Pénalités d\'assiette, impôts directs',0],
['6472','Pénalités d\'assiette, impôts indirects',0],
['6473','Pénalités de recouvrement, impôts directs',0],
['6474','Pénalités de recouvrement, impôts indirects',0],
['6478','Autres pénalités et amendes fiscales',0],
['648','Autres impôts et taxes',0],
['RI','Impôts et taxes',1],
['6511','Pertes sur créances clients',0],
['6515','Pertes sur autres débiteurs',0],
['6521','Quote-part transférée de bénéfices (comptabilité du gérant)',0],
['6525','Pertes imputées par transfert (comptabilité des associés non gérants)',0],
['6541','Valeur comptable des cessions courantes d\'immobilisations incorporelles',0],
['6542','Valeur comptable des cessions courantes d\'immobilisations corporelles',0],
['656','Perte de change sur créances et dettes commerciales',0],
['657','Pénalités et amendes pénales',0],
['6581','Indemnités de fonction et autres rémunérations d\'administrateurs',0],
['6582','Dons',0],
['6583','Mécénat',0],
['6588','Autres charges diverses',0],
['6591','Charges pour dépréciation et provisions d\'exploitation sur risques à court terme',0],
['6593','Charges pour dépréciation et provisions pour risque à court terme d\'exploitation sur stocks',0],
['6594','Charges pour dépréciation et provisions pour risque à court terme d\'exploitation sur créances',0],
['6598','Autres charges pour dépréciations et provisions pour risques à court terme d\'exploitation',0],
['RJ','Autres charges',1],
['6611','Appointements salaires et commissions versés au personnel national',0],
['6612','Primes et gratifications versées au personnel national',0],
['6613','Congés payés versés au personnel national',0],
['6614','Indemnités de préavis, de licenciement et de recherche d\'embauche versées au personnel national',0],
['6615','Indemnités de maladie versées aux travailleurs nationaux',0],
['6616','Supplément familial versé au personnel national',0],
['6617','Avantages en nature du personnel national',0],
['6618','Autres rénumérations directes versées au personnel national',0],
['6621','Appointements salaires et commissions versés au personnel non national',0],
['6622','Primes et gratifications versées au personnel non national',0],
['6623','Congés payés versés au personnel non national',0],
['6624','Indemnités de préavis, de licenciement et de recherche d\'embauche versées au personnel non national',0],
['6625','Indemnités de maladie versées aux travailleurs non nationaux',0],
['6626','Supplément familial versé au personnel non national',0],
['6627','Avantages en nature du personnel non national',0],
['6628','Autres rénumérations directes versées au personnel non national',0],
['6631','Indemnités forfaitaires de logement versées au personnel',0],
['6632','Indemnités forfaitaires de représentation versées au personnel',0],
['6633','Indemnités forfaitaires d\'expatriation versées au personnel',0],
['6634','Indemnités forfaitaires de transport versées au personnel',0],
['6638','Autres indemnités et avantages divers versés au personnel',0],
['6641','Charges sociales sur rémunération du personnel national',0],
['6642','Charges sociales sur rémunération du personnel non national',0],
['6661','Rémunérations du travail de l\'exploitant individuel',0],
['6662','Charges sociales de l\'exploitant individuel',0],
['6671','Rémunérations transférée du personnel intérimaire',0],
['6672','Rémunérations transférée du personnel détaché ou prêté à l\'entité',0],
['6681','Versements aux Syndicats et Comités d\'entreprise, d\'établissement',0],
['6682','Versements aux Comités d\'hygiène et de sécurité',0],
['6683','Versements et contributions aux autres œuvres sociales',0],
['6684','Médecine du travail et pharmacie',0],
['6685','Assurances et organismes de santé',0],
['6686','Assurances retraite et fonds de pension',0],
['6687','Majorations et pénalités sociales',0],
['6688','Charges sociales diverses',0],
['RK','Charges de personnel',1],
['6711','Intérêts des emprunts obligataires',0],
['6712','Intérêts des emprunts auprès des établissements de crédit',0],
['6713','Intérêts des dettes liées à des participations',0],
['6714','Intérêts des primes de remboursement des obligations',0],
['6721','Intérêts dans loyers de location acquisition/crédit-bail immobilier',0],
['6722','Intérêts dans loyers de location acquisition/crédit-bail mobilier',0],
['6723','Intérêts dans loyers de location acquisition/location-vente',0],
['6728','Intérêts dans loyers des autres locations acquisition',0],
['673','Escomptes accordés',0],
['6741','Intérêts sur avances reçues et dépôts créditeurs',0],
['6742','Intérêts sur Comptes courants bloqués',0],
['6743','Intérêts sur obligations cautionnées',0],
['6744','Intérêts sur dettes commerciales',0],
['6745','Intérêts bancaires et sur opérations de financement (escompte…)',0],
['6748','Intérêts sur dettes diverses                     ',0],
['675','Escomptes des effets de commerce',0],
['676','Pertes de change financières',0],
['6771','Pertes sur cessions de titre de placement',0],
['6772','Malis provenant d’attribution gratuite d’actions au personnel salarié et aux dirigeants',0],
['6781','Pertes et charges sur rentes viagères',0],
['6782','Pertes et charges sur opérations financières',0],
['6784','Pertes et charges sur instrument de trésorerie',0],
['6791','Charges pour dépréciations et provisions sur risques financiers à court terme',0],
['6795','Charges pour dépréciations et provisions sur titres de placement',0],
['6798','Autres charges pour dépréciations et provisions pour risques à court terme financières',0],
['6812','Dotations aux amortissements des immobilisations incorporelles',0],
['6813','Dotations aux amortissements des immobilisations corporelles',0],
['6911','Dotations aux provisions pour risques et charges',0],
['6913','Dotations aux dépréciations des immobilisations incorporelles',0],
['6914','Dotations aux dépréciations des immobilisations corporelles',0],
['6971','Dotations aux provisions pour risques et charges financières',0],
['6972','Dotations aux dépréciations des immobilisations financières',0],
['TOTAL DES CHARGES ORDINAIRES','TOTAL DES CHARGES ORDINAIRES',2]
];

// ---------- COMP-CHARGES : ETAT COMPLEMENTAIRE N°1 — DETAIL DES CHARGES (auto, depuis la balance) ----------
function liasseCompChargesCompute(){
    var n = (typeof balanceData !== 'undefined' && balanceData.n) ? balanceData.n : [];
    var n1 = (typeof balanceData !== 'undefined' && balanceData.n1) ? balanceData.n1 : [];
    function sumFor(code, rows){
        var t = 0;
        for(var i=0;i<rows.length;i++){
            var raw = String(rows[i].compte||'').trim();
            if(raw.indexOf(code) === 0){
                t += (parseNum(rows[i].sd)||0) - (parseNum(rows[i].sc)||0);
            }
        }
        return t;
    }
    var out = [], accN = 0, accN1 = 0, grandN = 0, grandN1 = 0;
    for(var i=0;i<COMP_CHARGES_STRUCT.length;i++){
        var row = COMP_CHARGES_STRUCT[i], kind = row[2];
        if(kind === 0){
            var vN = sumFor(row[0], n), vN1 = sumFor(row[0], n1);
            accN += vN; accN1 += vN1; grandN += vN; grandN1 += vN1;
            out.push({kind:'detail', code:row[0], label:row[1], n:vN, n1:vN1});
        } else if(kind === 1){
            out.push({kind:'subtotal', code:row[0], label:row[1], n:accN, n1:accN1});
            accN = 0; accN1 = 0;
        } else {
            out.push({kind:'total', code:'', label:row[1], n:grandN, n1:grandN1});
        }
    }
    return out;
}
function liasseRenderCompCharges(){
    var data = liasseCompChargesCompute();
    var rowsHtml = data.map(function(r){
        var varVal = r.n - r.n1;
        var varPct = r.n1 ? (varVal / Math.abs(r.n1) * 100) : (r.n ? 100 : 0);
        var style = r.kind === 'detail' ? '' : ' style="background:#f4f1ea;font-weight:700;color:#1B2A4A;"';
        return '<tr'+style+'><td>'+r.code+'</td><td>'+r.label+'</td>'+
            '<td class="num">'+liasseFmt(r.n)+'</td><td class="num">'+liasseFmt(r.n1)+'</td>'+
            '<td class="num">'+liasseFmt(varVal)+'</td><td class="num">'+varPct.toFixed(1)+' %</td></tr>';
    }).join('');
    return '<div class="alert alert-info" style="margin-bottom:14px;">État complémentaire n°1 — calculé automatiquement à partir de la balance générale (comptes de charges classe 6), par compte à 4 chiffres, avec sous-totaux par nature (achats, transports, services extérieurs, charges de personnel, dotations, etc.).</div>'+
        '<table class="liasse-table"><thead><tr><th style="width:70px;">Compte</th><th>Détail des charges</th><th>Exercice N</th><th>Exercice N-1</th><th>Variation (valeur)</th><th>Variation (%)</th></tr></thead><tbody>'+rowsHtml+'</tbody></table>';
}

// ---------- COMP-TVA : ETAT COMPLEMENTAIRE N°2 — ETAT TVA (saisie manuelle, mouvements de la période) ----------
function liasseRenderCompTva(){
    function fr(id, label, indent){
        var pad = indent ? ' style="padding-left:' + indent + 'px;"' : '';
        return '<tr><td'+pad+'>'+label+'</td>'+
            '<td><input type="number" id="'+id+'-n" onchange="liasseCompTvaTotaux()"></td>'+
            '<td><input type="number" id="'+id+'-n1" onchange="liasseCompTvaTotaux()"></td></tr>';
    }
    function fs(label, idN, idN1){
        return '<tr class="liasse-total-row"><td>'+label+'</td><td class="num" id="'+idN+'">0</td><td class="num" id="'+idN1+'">0</td></tr>';
    }
    return '<div class="alert alert-info" style="margin-bottom:14px;">État complémentaire n°2 — à servir avec les <strong>mouvements de la période</strong> (et non les soldes des comptes). Saisie manuelle : les montants ne sont pas déduits automatiquement de la balance.</div>'+
        '<table class="liasse-table"><thead><tr><th>Rubrique</th><th>Exercice N</th><th>Exercice N-1</th></tr></thead><tbody>'+
        fr('tva-fact-ventes','T.V.A. facturée sur ventes de la période')+
        fr('tva-fact-prest','T.V.A. facturée sur prestations de services de la période')+
        fr('tva-fact-travaux','T.V.A. facturée sur travaux de la période')+
        fr('tva-fact-plsm','T.V.A. facturée sur production livrée à soi-même de la période')+
        fr('tva-fact-fae','T.V.A. sur factures à établir de la période')+
        fs('T.V.A. facturée de la période / T.V.A. exigible de la période','tva-tot-facturee-n','tva-tot-facturee-n1')+
        fr('tva-rec-immo','T.V.A. récupérable sur immobilisations de la période')+
        fr('tva-rec-achats','T.V.A. récupérable sur achats de la période')+
        fr('tva-rec-transport','T.V.A. récupérable sur transport de la période')+
        fr('tva-rec-serv','T.V.A. récupérable sur services extérieurs et autres charges de la période')+
        fr('tva-rec-fnp','T.V.A. récupérable sur factures non parvenues de la période')+
        fr('tva-rec-transferee',"T.V.A. transférée par d'autres entités de la période")+
        fs('T.V.A. Récupérable de la période / T.V.A. Récupérée de la période','tva-tot-recuperable-n','tva-tot-recuperable-n1')+
        '<tr><td>Prorata de déduction (%)</td><td><input type="number" id="tva-prorata-n"></td><td><input type="number" id="tva-prorata-n1"></td></tr>'+
        '<tr><td>État, T.V.A. due</td><td><input type="number" id="tva-due-n"></td><td><input type="number" id="tva-due-n1"></td></tr>'+
        '<tr><td>État, crédit de T.V.A. à reporter</td><td><input type="number" id="tva-credit-n"></td><td><input type="number" id="tva-credit-n1"></td></tr>'+
        fs('T.V.A. Due ou crédit de T.V.A.','tva-tot-solde-n','tva-tot-solde-n1')+
        '</tbody></table>';
}
function liasseCompTvaTotaux(){
    function sum(ids){
        return ids.reduce(function(acc, id){
            var el = document.getElementById(id);
            return acc + (el ? (parseNum(el.value)||0) : 0);
        }, 0);
    }
    var facturee = ['tva-fact-ventes','tva-fact-prest','tva-fact-travaux','tva-fact-plsm','tva-fact-fae'];
    var recuperable = ['tva-rec-immo','tva-rec-achats','tva-rec-transport','tva-rec-serv','tva-rec-fnp','tva-rec-transferee'];
    var totFactN = sum(facturee.map(function(x){return x+'-n';}));
    var totFactN1 = sum(facturee.map(function(x){return x+'-n1';}));
    var totRecN = sum(recuperable.map(function(x){return x+'-n';}));
    var totRecN1 = sum(recuperable.map(function(x){return x+'-n1';}));
    var elA = document.getElementById('tva-tot-facturee-n'); if(elA) elA.textContent = liasseFmt(totFactN);
    var elB = document.getElementById('tva-tot-facturee-n1'); if(elB) elB.textContent = liasseFmt(totFactN1);
    var elC = document.getElementById('tva-tot-recuperable-n'); if(elC) elC.textContent = liasseFmt(totRecN);
    var elD = document.getElementById('tva-tot-recuperable-n1'); if(elD) elD.textContent = liasseFmt(totRecN1);
    var elE = document.getElementById('tva-tot-solde-n'); if(elE) elE.textContent = liasseFmt(totFactN - totRecN);
    var elF = document.getElementById('tva-tot-solde-n1'); if(elF) elF.textContent = liasseFmt(totFactN1 - totRecN1);
}

// ---------- COMP-TVA (2) : ETAT COMPLEMENTAIRE N°3 — TVA SUPPORTEE NON DEDUCTIBLE (saisie manuelle) ----------
function liasseRenderCompTva2(){
    return '<div class="alert alert-info" style="margin-bottom:14px;">État complémentaire n°3 (pour l\'INS) — à servir avec les mouvements de la période. Saisie manuelle.</div>'+
        '<table class="liasse-table"><thead><tr><th>Rubrique</th><th>Exercice N</th><th>Exercice N-1</th></tr></thead><tbody>'+
        '<tr><td>T.V.A. supportée non déductible sur les immobilisations</td><td><input type="number" id="tva2-immo-n" onchange="liasseCompTva2Total()"></td><td><input type="number" id="tva2-immo-n1" onchange="liasseCompTva2Total()"></td></tr>'+
        '<tr><td>T.V.A. supportée non déductible sur les achats de biens et de services</td><td><input type="number" id="tva2-achats-n" onchange="liasseCompTva2Total()"></td><td><input type="number" id="tva2-achats-n1" onchange="liasseCompTva2Total()"></td></tr>'+
        '<tr class="liasse-total-row"><td>Total T.V.A. supportée non déductible de la période</td><td class="num" id="tva2-total-n">0</td><td class="num" id="tva2-total-n1">0</td></tr>'+
        '</tbody></table>';
}
function liasseCompTva2Total(){
    var n = (parseNum(document.getElementById('tva2-immo-n').value)||0) + (parseNum(document.getElementById('tva2-achats-n').value)||0);
    var n1 = (parseNum(document.getElementById('tva2-immo-n1').value)||0) + (parseNum(document.getElementById('tva2-achats-n1').value)||0);
    document.getElementById('tva2-total-n').textContent = liasseFmt(n);
    document.getElementById('tva2-total-n1').textContent = liasseFmt(n1);
}

// ---------- GARDE (DGI-INS) : PAGE DE GARDE DES ETATS SUPPLEMENTAIRES ----------
function liasseRenderGardeDgiIns(){
    var raison = val('fi-raison') || '[Raison sociale non renseignée]';
    return '<div style="text-align:center;padding:60px 20px;">'+
        '<div style="font-size:15px;font-weight:800;color:#1B2A4A;letter-spacing:.5px;margin-bottom:10px;">ETATS SUPPLEMENTAIRES</div>'+
        '<div style="font-size:13px;font-weight:700;color:#B8975A;text-transform:uppercase;margin-bottom:40px;">DIRECTION GENERALE DES IMPOTS &nbsp;&amp;&nbsp; INSTITUT NATIONAL DE LA STATISTIQUE</div>'+
        '<div style="font-size:18px;font-weight:700;color:#1B2A4A;margin-top:30px;">'+raison+'</div>'+
        '<div style="font-size:12px;color:#888;margin-top:10px;">Exercice clos le '+(val('fi-cloture') || '—')+'</div>'+
        '</div>';
}

// ---------- NOTES DGI-INS : FICHE RECAPITULATIVE DES ETATS SUPPLEMENTAIRES ----------
var NOTES_DGIINS_LISTE = [
    ['COMP - CHARGES', 'ETAT COMPLEMENTAIRE : DETAIL DES CHARGES'],
    ['COMP - TVA (1)', 'ETAT COMPLEMENTAIRE : TVA'],
    ['COMP - TVA (2)', "ETAT COMPLEMENTAIRE POUR L'INS : TVA SUPPORTEE NON DEDUCTIBLE"],
    ['SUPPL 1', 'ELEMENTS STATISTIQUES UEMOA'],
    ['SUPPL 2', 'REPARTITION DU RESULTAT FISCAL DES SOCIETES DE PERSONNES'],
    ['SUPPL 3', 'COMPLEMENT INFORMATIONS ENTITES INDIVIDUELLES'],
    ['SUPPL 4', "TABLEAU DES AMORTISSEMENTS ET INVENTAIRE DES IMMOBILISATIONS"],
    ['SUPPL 5', 'DETAIL DES FRAIS ACCESSOIRES SUR ACHATS'],
    ['SUPPL 6', 'DETAIL DES AVANTAGES EN NATURE ET EN ESPECES IMPOSES ALLOUES AU PERSONNEL'],
    ['SUPPL 7', "CREANCES ET DETTES ECHUES DE L'EXERCICE"],
    ['BIC', 'DETERMINATION DU BENEFICE INDUSTRIEL OU COMMERCIAL'],
    ['BNC', 'DETERMINATION DU BENEFICE NON COMMERCIAL'],
    ['BA', 'DETERMINATION DU BENEFICE AGRICOLE'],
    ['301', "DECLARATION DES REMUNERATIONS VERSEES AUX SALARIES DE L'ENTREPRISE"],
    ['302', "DECLARATION DES REMUNERATIONS VERSEES A DES CONTRIBUABLES N'AYANT PAS LA QUALITE DE SALARIES DE L'ENTREPRISE"]
];
function liasseRenderNotesDgiIns(){
    var rows = NOTES_DGIINS_LISTE.map(function(item, idx){
        var id = 'dgiins-app-'+idx;
        return '<tr><td>'+item[0]+'</td><td>'+item[1]+'</td>'+
            '<td style="text-align:center;"><input type="radio" name="'+id+'" value="A"></td>'+
            '<td style="text-align:center;"><input type="radio" name="'+id+'" value="NA" checked></td></tr>';
    }).join('');
    return '<div class="alert alert-info" style="margin-bottom:14px;">Fiche récapitulative des états supplémentaires DGI &amp; INS présentés. Cette page n\'est pas exportée dans le fichier XML e-impôts : une fiche récapitulative équivalente y est générée automatiquement à partir des pages effectivement renseignées.</div>'+
        '<table class="liasse-table"><thead><tr><th style="width:110px;">Notes</th><th>Intitulés</th><th style="width:70px;">Applicable</th><th style="width:90px;">Non applicable</th></tr></thead><tbody>'+rows+'</tbody></table>'+
        '<div style="font-size:11px;color:#666;margin-top:14px;line-height:1.6;">Le contribuable peut insérer autant de déclarations fiscales supplémentaires (SUPPL, BIC/BNC/BA, 301/302, etc.) qu\'il le souhaite, en cochant « Applicable » pour chaque état effectivement rempli et joint à la liasse.</div>';
}

// Rendu d'un seul bloc, selon son propre type s'il en déclare un (permet
// de mélanger, au sein d'une même note, un détail statique et un tableau
// de mouvement — cas de la NOTE 28, qui reprend les dotations du compte
// de résultat ET le mouvement des provisions du bilan), sinon celui de
// la note entière.
function liasseRenderNoteBlock(block, typeNote){
    var type = block.type || typeNote;
    if(type === 'auto-mvt') return liasseRenderMvtBlock(block);
    if(type === 'auto-mvt-amort') return liasseRenderMvtAmortBlock(block);
    return liasseRenderDetailBlock(block);
}

function liasseRenderNote(num){
    var cfg = liasseNoteByNum(num);
    if(!cfg) return '<div class="liasse-soon">Note introuvable.</div>';
    var body = '';
    if(cfg.type === 'auto-detail' || cfg.type === 'auto-mvt' || cfg.type === 'auto-mvt-amort'){
        body = cfg.blocks.map(function(b){ return liasseRenderNoteBlock(b, cfg.type); }).join('');
    } else if(cfg.type === 'auto-custom'){
        body = liasseRenderCustomNote(cfg);
    } else if(cfg.type === 'note36-codes'){
        body = liasseRenderNote36Codes();
    } else if(cfg.type === 'note36-nomenclature'){
        body = liasseRenderNote36Nomenclature();
    } else {
        body = liasseRenderManualNote(cfg);
    }
    var noteNumLabel = (cfg.num === '36S') ? '36 (suite)' : cfg.num;
    return '<div class="liasse-header" style="text-align:left;margin-bottom:16px;">'+
        '<h2 style="margin:0;">NOTE '+noteNumLabel+'</h2>'+
        '<div class="liasse-sub" style="letter-spacing:normal;">'+cfg.title+'</div></div>'+body;
}

function liasseNotesNavHtml(){
    return NOTES_CONFIG.map(function(cfg){
        var active = (cfg.num === LIASSE_CURRENT_NOTE) ? ' active' : '';
        var navLabel = (cfg.num === '36S') ? '36 (suite)' : cfg.num;
        return '<button type="button" class="liasse-note-navbtn'+active+'" onclick="liasseShowNote(\''+cfg.num+'\')">'+navLabel+'</button>';
    }).join('');
}

function liasseShowNote(num){
    LIASSE_CURRENT_NOTE = num;
    var nav = document.getElementById('liasse-notes-nav');
    var content = document.getElementById('liasse-notes-content');
    if(nav) nav.innerHTML = liasseNotesNavHtml();
    if(content) content.innerHTML = liasseRenderNote(num);
}

function liasseRenderNotesPanel(){
    if(!LIASSE_CURRENT_NOTE) LIASSE_CURRENT_NOTE = NOTES_CONFIG[0].num;
    var nav = document.getElementById('liasse-notes-nav');
    var content = document.getElementById('liasse-notes-content');
    if(nav) nav.innerHTML = liasseNotesNavHtml();
    if(content) content.innerHTML = liasseRenderNote(LIASSE_CURRENT_NOTE);
}

// ---------- Rendu HTML : COUVERTURE (page de garde officielle DGI) ----------
var LIASSE_ARMOIRIES_CI = 'data:image/jpeg;base64,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';

function liasseRenderCouverture(){
    var raison = val('fi-raison') || '[Raison sociale non renseignée]';
    var forme = val('fi-forme');
    var exercice = val('fi-exercice');
    var cloture = val('fi-cloture');
    var clotureTxt = '';
    if(cloture){
        var d = new Date(cloture);
        if(!isNaN(d.getTime())) clotureTxt = ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
    }
    return '<div class="liasse-cover">'+
        '<div class="liasse-tricolor-bar"><span class="bar-orange"></span><span class="bar-white"></span><span class="bar-green"></span></div>'+
        '<img class="armoiries" src="'+LIASSE_ARMOIRIES_CI+'" alt="Armoiries de la République de Côte d\'Ivoire">'+
        '<div class="republique">RÉPUBLIQUE DE CÔTE D\'IVOIRE</div>'+
        '<div class="devise">Union — Discipline — Travail</div>'+
        '<div class="ministere">Ministère en charge des Finances</div>'+
        '<div class="dgi">Direction Générale des Impôts</div>'+
        '<div class="titre-principal">LIASSE DES ÉTATS FINANCIERS</div>'+
        '<div class="soustitre">SYSTÈME NORMAL</div>'+
        '<div class="soustitre2">Système Comptable OHADA (SYSCOHADA) révisé</div>'+
        '<div class="exercice-badge">EXERCICE CLOS LE '+(clotureTxt || (exercice ? '31/12/'+liasseEsc(exercice) : '[date non renseignée]'))+'</div>'+
        '<div class="entite-name">'+liasseEsc(raison)+'</div>'+
        (forme ? '<div class="entite-sub">'+liasseEsc(forme)+'</div>' : '')+
        '<div class="liasse-tricolor-bar liasse-tricolor-bar-bottom"><span class="bar-orange"></span><span class="bar-white"></span><span class="bar-green"></span></div>'+
    '</div>';
}

// ---------- Rendu HTML : GARDE (fiche d'identification et renseignements divers) ----------
function liasseRenderGarde(){
    var raison = val('fi-raison'), forme = val('fi-forme'), rccm = val('fi-rccm'), nif = val('fi-nif'),
        siege = val('fi-siege'), secteur = val('fi-secteur'), capital = val('fi-capital'), exercice = val('fi-exercice'),
        cloture = val('fi-cloture');
    var clotureTxt = '';
    if(cloture){
        var d = new Date(cloture);
        if(!isNaN(d.getTime())) clotureTxt = ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
    }
    function row(label, value){
        return '<tr><td class="label">'+label+'</td><td>'+(value ? liasseEsc(value) : '<span style="color:#aaa;">— non renseigné —</span>')+'</td></tr>';
    }
    var docs = [
        ["Fiche d'identification et renseignements divers", true],
        ["Bilan", true],
        ["Compte de résultat", true],
        ["Tableau des flux de trésorerie", true],
        ["Notes annexes", true],
        ["Etats supplémentaires DGI", true]
    ];
    var docsRows = docs.map(function(d){
        return '<tr><td>'+d[0]+'</td><td class="chk">'+(d[1] ? '✔' : '')+'</td></tr>';
    }).join('');
    return '<div class="liasse-garde-section-title">Désignation de l\'entité</div>'+
        '<table class="liasse-garde-table">'+
            row('Dénomination sociale', raison)+
            row('Forme juridique', forme)+
            row('N° RCCM', rccm)+
            row('N° compte contribuable (NCC / NIF)', nif)+
            row('Siège social / Adresse complète', siege)+
            row('Secteur d\'activité', secteur)+
            row('Capital social', capital ? Number(capital).toLocaleString('fr-FR')+' FCFA' : '')+
            row('Exercice clos le', clotureTxt || (exercice ? '31/12/'+exercice : ''))+
        '</table>'+
        '<div class="liasse-garde-section-title">Système déclaré</div>'+
        '<table class="liasse-garde-table">'+row('Régime', 'SYSTEME NORMAL')+'</table>'+
        '<div class="liasse-garde-section-title">Documents déposés</div>'+
        '<div class="liasse-checklist"><table><thead><tr><th>Pièce</th><th>Déposé</th></tr></thead><tbody>'+docsRows+'</tbody></table></div>'+
        '<div class="liasse-dgi-box"><div class="titre">Réservé à la Direction Générale des Impôts</div>'+
            'Date de dépôt : …………………………………………<br>'+
            'Nom de l\'agent de la DGI ayant réceptionné le dépôt : …………………………………………<br>'+
            'Signature de l\'agent et cachet du service : …………………………………………<br>'+
            'Nombre de pages déposées par exemplaire : …………… — Nombre d\'exemplaires déposés : ……………'+
        '</div>';
}

// ---------- Rendu HTML : RECEVABILITE (conditions de recevabilité de la liasse) ----------
function liasseRenderRecevabilite(){
    return '<div class="liasse-recevabilite">'+
        '<h4>Entités utilisant des imprimés</h4>'+
        '<ul>'+
            '<li>N\'utiliser que des imprimés normalisés.</li>'+
            '<li>Remplir chaque page de façon parfaitement lisible sans décalage de lignes.</li>'+
            '<li>Ne créer aucune rubrique.</li>'+
            '<li>Éviter toute surcharge et donner les explications sur une feuille séparée.</li>'+
            '<li>N\'utiliser que les codes indiqués dans les tables.</li>'+
            '<li>N\'utiliser que des imprimés en noir et blanc.</li>'+
        '</ul>'+
        '<h4>Entités produisant les états financiers à l\'aide de l\'outil informatique</h4>'+
        '<ul>'+
            '<li>Reproduire à l\'identique la contexture des imprimés normalisés.</li>'+
            '<li>Fournir une liasse comprenant à la fois : la fiche d\'identification et renseignements divers et les états financiers correspondant au système comptable.</li>'+
            '<li>Ne créer aucune rubrique.</li>'+
            '<li>N\'utiliser que les codes indiqués dans les tables.</li>'+
            '<li>N\'utiliser que des imprimés en noir et blanc.</li>'+
        '</ul>'+
        '<h4>États financiers</h4>'+
        '<ul>'+
            '<li>Les rubriques et les postes du Bilan, du Compte de résultat et du Tableau des flux de trésorerie non chiffrés ne doivent pas être supprimés.</li>'+
            '<li>Les Notes annexes non chiffrées doivent être supprimées. Cependant elles devront être indiquées dans la Fiche Récapitulative des Notes Annexes (Fiche R4).</li>'+
            '<li>Les états financiers devront être accompagnés d\'une attestation de visa ou d\'une attestation d\'exécution de la mission de commissariat aux comptes.</li>'+
        '</ul>'+
    '</div>';
}


// ---------- FICHE R1 : FICHE D'IDENTIFICATION ET RENSEIGNEMENTS DIVERS 1 ----------
function liasseRenderFicheR1(){
    function fg(id, label, type){
        type = type || 'text';
        return '<div class="form-group"><label>'+label+'</label><input type="'+type+'" id="'+id+'"></div>';
    }
    return '<div class="alert alert-info" style="margin-bottom:14px;">Renseignez les champs ci-dessous (codes officiels ZA à ZW de la Fiche R1). Ces informations sont propres à la liasse fiscale et distinctes des champs de l\'onglet Fiche Identification de la mission d\'audit.</div>'+
        '<div class="liasse-garde-section-title">Exercice comptable (ZA - ZD)</div>'+
        '<div class="form-row">'+fg('r1-exercice-du','Exercice comptable — Du','date')+fg('r1-exercice-au','Exercice comptable — Au','date')+fg('r1-date-arrete','Date d\'arrêté effectif des comptes','date')+'</div>'+
        '<div class="form-row">'+fg('r1-exercice-prec','Exercice précédent clos le','date')+fg('r1-exercice-prec-duree','Durée exercice précédent (en mois)','number')+'</div>'+
        '<div class="liasse-garde-section-title">Identification légale (ZE - ZJ)</div>'+
        '<div class="form-row">'+fg('r1-greffe','Greffe (code pays, ex. CI)')+fg('r1-rccm','N° Registre du Commerce (RCCM)')+fg('r1-repertoire','N° Répertoire des entités (ou NEANT)')+'</div>'+
        '<div class="form-row">'+fg('r1-caisse-sociale','N° de caisse sociale')+fg('r1-code-importateur','N° Code Importateur')+fg('r1-code-activite','Code activité principale (Note 36 suite)')+'</div>'+
        '<div class="form-row">'+fg('r1-designation','Désignation de l\'entité')+fg('r1-sigle','Sigle')+'</div>'+
        '<div class="liasse-garde-section-title">Coordonnées (ZK - ZM)</div>'+
        '<div class="form-row">'+fg('r1-telephone','N° de téléphone')+fg('r1-email','Adresse e-mail','email')+fg('r1-code-postal','Code (boîte postale)')+fg('r1-bp','Boîte Postale')+fg('r1-ville','Ville')+'</div>'+
        '<div class="form-row">'+fg('r1-adresse-geo','Adresse géographique complète (immeuble, rue, quartier, ville, pays)')+'</div>'+
        '<div class="form-row">'+fg('r1-activite-precise','Désignation précise de l\'activité principale exercée')+fg('r1-capacite','% Capacité de production utile','number')+'</div>'+
        '<div class="liasse-garde-section-title">Personne à contacter (ZO)</div>'+
        '<div class="form-row">'+fg('r1-contact-nom','Nom')+fg('r1-contact-adresse','Adresse')+fg('r1-contact-tel','Téléphone')+fg('r1-contact-email','Adresse e-mail','email')+fg('r1-contact-qualite','Qualité')+'</div>'+
        '<div class="liasse-garde-section-title">Établissement des états financiers (ZP - ZR)</div>'+
        '<div style="font-size:12px;color:#666;margin-bottom:6px;">Salarié de l\'entité ou professionnel comptable inscrit à l\'Ordre des Experts-Comptables ayant établi les états financiers :</div>'+
        '<div class="form-row">'+fg('r1-etats-nom','Nom')+fg('r1-etats-adresse','Adresse')+fg('r1-etats-tel','Téléphone')+fg('r1-etats-email','Adresse e-mail','email')+'</div>'+
        '<div style="font-size:12px;color:#666;margin-bottom:6px;">Nom, adresse, téléphone, e-mail et n° d\'inscription à l\'Ordre des Experts-Comptables de l\'Expert-comptable ayant délivré l\'attestation de visa :</div>'+
        '<div class="form-row">'+fg('r1-visa-expert','Expert-comptable (nom, adresse, téléphone, e-mail, n° inscription)')+'</div>'+
        '<div style="font-size:12px;color:#666;margin-bottom:6px;">Nom, adresse, téléphone, e-mail et n° d\'inscription à l\'Ordre des Experts-Comptables de l\'Expert-comptable ayant délivré l\'attestation d\'exécution de la mission de commissariat aux comptes :</div>'+
        '<div class="form-row">'+fg('r1-cac-expert','Expert-comptable / Commissaire aux comptes (nom, adresse, téléphone, e-mail, n° inscription)')+'</div>'+
        '<div class="liasse-garde-section-title">Approbation et signature (ZS - ZV)</div>'+
        '<div class="form-row"><div class="form-group"><label>États financiers approuvés par l\'Assemblée Générale</label>'+
        '<select id="r1-approuve-ag"><option value="">—</option><option value="OUI">OUI</option><option value="NON">NON</option></select></div>'+
        fg('r1-signataire-nom','Nom du signataire des états financiers')+fg('r1-signataire-qualite','Qualité du signataire')+fg('r1-signature-date','Date de signature','date')+'</div>'+
        '<div class="liasse-garde-section-title">Domiciliations bancaires (ZW)</div>'+
        '<table class="liasse-table" id="table-r1-banques"><thead><tr><th>Banque</th><th>Numéro de compte</th><th style="width:40px;"></th></tr></thead><tbody>'+
        '<tr><td><input type="text"></td><td><input type="text"></td><td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td></tr>'+
        '</tbody></table>'+
        '<button class="btn btn-primary" onclick="addRow(\'table-r1-banques\',[\'text\',\'text\'])">+ Ajouter une domiciliation bancaire</button>';
}

// ---------- FICHE R2 : FORME JURIDIQUE, REGIME FISCAL, ACTIVITES ----------
var NOTE36_CONTROLE_TYPES = [
    'Entité sous contrôle privé national',
    'Entité sous contrôle privé étranger',
    'Entité sous contrôle public national',
    'Entité sous contrôle public étranger',
    'Entité sous contrôle mixte (public / privé)',
    'Entité sous contrôle mixte (national / étranger)'
];
function liasseRenderFicheR2(){
    function selectFromCodes(id, rows, label){
        var opts = rows.map(function(r){ return '<option value="'+r[0]+'">'+r[0]+' — '+r[1]+'</option>'; }).join('');
        return '<div class="form-group"><label>'+label+'</label><select id="'+id+'"><option value="">—</option>'+opts+'</select></div>';
    }
    var controleOpts = NOTE36_CONTROLE_TYPES.map(function(t){ return '<option value="'+t+'">'+t+'</option>'; }).join('');
    return '<div class="alert alert-info" style="margin-bottom:14px;">Les codes forme juridique, régime fiscal et pays du siège social se réfèrent à la <strong>NOTE 36 (Table des codes)</strong>. Le code activité de chaque ligne se réfère à la <strong>NOTE 36 (suite) — Nomenclature CIAP</strong>.</div>'+
        '<div class="form-row">'+
            selectFromCodes('r2-forme-juridique', NOTE36_FORMES, 'Forme juridique (ZX)')+
            selectFromCodes('r2-regime-fiscal', NOTE36_REGIMES, 'Régime fiscal (ZY)')+
        '</div>'+
        '<div class="form-row">'+
            '<div class="form-group"><label>Pays du siège social (ZZ1)</label><input type="text" id="r2-pays-siege" placeholder="Code pays — voir Note 36"></div>'+
            '<div class="form-group"><label>Nombre d\'établissements dans le pays (ZZ2)</label><input type="number" id="r2-nb-etab-pays"></div>'+
        '</div>'+
        '<div class="form-row">'+
            '<div class="form-group"><label>Nombre d\'établissements hors du pays avec comptabilité distincte (ZZ3)</label><input type="number" id="r2-nb-etab-hors-pays"></div>'+
            '<div class="form-group"><label>Première année d\'exercice dans le pays (ZZ4)</label><input type="number" id="r2-premiere-annee" placeholder="ex. 2017"></div>'+
        '</div>'+
        '<div class="liasse-garde-section-title">Contrôle de l\'entité</div>'+
        '<div class="form-row"><div class="form-group" style="max-width:400px;"><label>Type de contrôle</label><select id="r2-type-controle"><option value="">—</option>'+controleOpts+'</select></div></div>'+
        '<div style="font-size:11px;color:#888;margin:-6px 0 14px 0;">Liste indicative — à confirmer avec la nomenclature officielle DGI/INS en vigueur pour l\'exercice.</div>'+
        '<div class="liasse-garde-section-title">Activité de l\'entité</div>'+
        '<table class="liasse-table" id="table-r2-activites"><thead><tr><th>Désignation de l\'activité</th><th style="width:130px;">Code nomenclature (Note 36 suite)</th><th style="width:130px;">Chiffre d\'affaires HT</th><th style="width:90px;">% activité</th><th style="width:40px;"></th></tr></thead><tbody id="table-r2-activites-body">'+
        '<tr><td><input type="text"></td><td><input type="text"></td><td><input type="number" onchange="liasseR2Totaux()"></td><td><input type="number" onchange="liasseR2Totaux()"></td><td><button class="btn btn-danger" onclick="deleteRow(this);liasseR2Totaux()">✕</button></td></tr>'+
        '<tr><td><input type="text" value="Divers"></td><td></td><td><input type="number" onchange="liasseR2Totaux()"></td><td><input type="number" onchange="liasseR2Totaux()"></td><td><button class="btn btn-danger" onclick="deleteRow(this);liasseR2Totaux()">✕</button></td></tr>'+
        '</tbody>'+
        '<tfoot><tr class="liasse-total-row"><td colspan="2">TOTAL</td><td class="num" id="r2-total-ca">0</td><td class="num" id="r2-total-pct">0</td><td></td></tr></tfoot></table>'+
        '<button class="btn btn-primary" onclick="addRow(\'table-r2-activites-body\',[\'text\',\'text\',\'number\',\'number\']);liasseR2WireLast();">+ Ajouter une activité</button>'+
        '<div style="font-size:11px;color:#666;margin-top:10px;line-height:1.5;">'+
            '(1) Note 36 (Table des codes).<br>'+
            '(2) Choisir Chiffre d\'affaires HT ou Valeur Ajoutée selon le poste ; en Côte d\'Ivoire, pour les besoins de l\'INS, on préfèrera le chiffre d\'affaires.<br>'+
            '(3) Lister les activités par ordre décroissant du C.A. HT ou de la Valeur Ajoutée.<br>'+
            '(4) Indiquer dans la Note annexe n°21 « Chiffre d\'affaires et autres produits » le détail des activités classées dans la rubrique « Divers ».<br>'+
            '(5) Note 36 (suite) — Nomenclature CIAP.</div>';
}
function liasseR2WireLast(){
    var body = document.getElementById('table-r2-activites-body');
    if(!body) return;
    var lastRow = body.lastElementChild;
    if(!lastRow) return;
    var inputs = lastRow.querySelectorAll('input[type="number"]');
    inputs.forEach(function(inp){ inp.setAttribute('onchange','liasseR2Totaux()'); });
    var btn = lastRow.querySelector('.btn-danger');
    if(btn) btn.setAttribute('onclick', 'deleteRow(this);liasseR2Totaux()');
}
function liasseR2Totaux(){
    var body = document.getElementById('table-r2-activites-body');
    if(!body) return;
    var totCA = 0, totPct = 0;
    body.querySelectorAll('tr').forEach(function(tr){
        var nums = tr.querySelectorAll('input[type="number"]');
        if(nums.length >= 2){
            totCA += parseNum(nums[0].value) || 0;
            totPct += parseNum(nums[1].value) || 0;
        }
    });
    var elCA = document.getElementById('r2-total-ca'), elPct = document.getElementById('r2-total-pct');
    if(elCA) elCA.textContent = liasseFmt(totCA);
    if(elPct) elPct.textContent = totPct.toFixed(2)+' %';
}

// ---------- FICHE R3 : DIRIGEANTS ET MEMBRES DU CONSEIL D'ADMINISTRATION ----------
function liasseRenderFicheR3(){
    return '<div class="liasse-garde-section-title">Dirigeants (1)</div>'+
        '<table class="liasse-table" id="table-r3-dirigeants"><thead><tr><th>Nom et Prénoms</th><th>Nationalité</th><th>Autres nationalités (2)</th><th>Qualité</th><th>N° d\'identification fiscale</th><th>Adresse (BP, ville, pays, adresse géographique et e-mail)</th><th style="width:40px;"></th></tr></thead><tbody>'+
        '<tr><td><input type="text"></td><td><input type="text"></td><td><input type="text"></td><td><input type="text"></td><td><input type="text"></td><td><input type="text"></td><td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td></tr>'+
        '</tbody></table>'+
        '<button class="btn btn-primary" onclick="addRow(\'table-r3-dirigeants\',[\'text\',\'text\',\'text\',\'text\',\'text\',\'text\'])">+ Ajouter un dirigeant</button>'+
        '<div style="font-size:11px;color:#666;margin:10px 0 20px 0;">(1) Dirigeants = Président Directeur Général, Directeur Général, Administrateur Général, Gérant, Autres.<br>(2) En cas de double nationalité.</div>'+
        '<div class="liasse-garde-section-title">Membres du conseil d\'administration</div>'+
        '<table class="liasse-table" id="table-r3-conseil"><thead><tr><th>Nom et Prénoms</th><th>Structure représentée</th><th>Qualité</th><th>Adresse (BP, ville, pays, adresse géographique et e-mail)</th><th style="width:40px;"></th></tr></thead><tbody>'+
        '<tr><td><input type="text"></td><td><input type="text"></td><td><input type="text"></td><td><input type="text"></td><td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td></tr>'+
        '</tbody></table>'+
        '<button class="btn btn-primary" onclick="addRow(\'table-r3-conseil\',[\'text\',\'text\',\'text\',\'text\'])">+ Ajouter un membre</button>';
}

function liasseRefreshAll(){
    var cov = document.getElementById('liasse-couverture-content');
    var gar = document.getElementById('liasse-garde-content');
    var rec = document.getElementById('liasse-recevabilite-content');
    if(cov) cov.innerHTML = liasseRenderCouverture();
    if(gar) gar.innerHTML = liasseRenderGarde();
    if(rec && !rec.innerHTML) rec.innerHTML = liasseRenderRecevabilite();
    var r1 = document.getElementById('liasse-r1-content');
    var r2 = document.getElementById('liasse-r2-content');
    var r3 = document.getElementById('liasse-r3-content');
    if(r1 && !r1.innerHTML) r1.innerHTML = liasseRenderFicheR1();
    if(r2 && !r2.innerHTML){ r2.innerHTML = liasseRenderFicheR2(); liasseR2Totaux(); }
    if(r3 && !r3.innerHTML) r3.innerHTML = liasseRenderFicheR3();
    var gardeDgiIns = document.getElementById('liasse-garde-dgiins-content');
    if(gardeDgiIns) gardeDgiIns.innerHTML = liasseRenderGardeDgiIns();
    var notesDgiIns = document.getElementById('liasse-notes-dgiins-content');
    if(notesDgiIns && !notesDgiIns.innerHTML) notesDgiIns.innerHTML = liasseRenderNotesDgiIns();
    var compCharges = document.getElementById('liasse-comp-charges-content');
    if(compCharges) compCharges.innerHTML = liasseRenderCompCharges();
    var compTva = document.getElementById('liasse-comp-tva-content');
    if(compTva && !compTva.innerHTML) compTva.innerHTML = liasseRenderCompTva();
    var param = document.getElementById('liasse-parametres-content');
    if(param && !param.innerHTML) param.innerHTML = paramRenderAll();
    var compTva2 = document.getElementById('liasse-comp-tva2-content');
    if(compTva2 && !compTva2.innerHTML) compTva2.innerHTML = liasseRenderCompTva2();
    var bn1 = document.getElementById('liasse-balance-n1-content');
    var bn = document.getElementById('liasse-balance-n-content');
    var a = document.getElementById('liasse-actif-content');
    var p = document.getElementById('liasse-passif-content');
    var r = document.getElementById('liasse-resultat-content');
    var t = document.getElementById('liasse-tft-content');
    if(bn1) bn1.innerHTML = liasseRenderBalance('n1');
    if(bn) bn.innerHTML = liasseRenderBalance('n');
    if(a) a.innerHTML = liasseRenderActif();
    if(p) p.innerHTML = liasseRenderPassif();
    if(r) r.innerHTML = liasseRenderResultat();
    if(t) t.innerHTML = liasseRenderTFT();
    var notesPanel = document.getElementById('liasse-notes');
    if(notesPanel && notesPanel.classList.contains('active')) liasseRenderNotesPanel();
}

function showInterface(name){
    var audit = document.getElementById('interface-audit-wrap');
    var liasse = document.getElementById('interface-liasse');
    var btnAudit = document.getElementById('btn-interface-audit');
    var btnLiasse = document.getElementById('btn-interface-liasse');
    if(name === 'liasse'){
        if(audit) audit.style.display = 'none';
        if(liasse) liasse.style.display = 'block';
        if(btnAudit) btnAudit.classList.remove('active');
        if(btnLiasse) btnLiasse.classList.add('active');
        liasseRefreshAll();
    } else {
        if(audit) audit.style.display = '';
        if(liasse) liasse.style.display = 'none';
        if(btnAudit) btnAudit.classList.add('active');
        if(btnLiasse) btnLiasse.classList.remove('active');
    }
}
