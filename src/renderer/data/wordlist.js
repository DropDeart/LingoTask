// Spell-checking vocabulary for offline mode. Deliberately not exhaustive: a word is only ever
// flagged when it is BOTH unknown AND within one or two edits of a known word, so a missing
// entry costs a missed error, never a false alarm on a word the learner spelled correctly.
// The AWL headwords and the app's own vocabulary are merged in at load time.
const COMMON_WORDS_RAW = `
a able about above accept across act action add address advantage afraid after afternoon again against age ago agree air all allow almost alone along already also although always among amount and anger angry animal another answer any anyone anything appear apple apply area argue arm around arrive art article as ask asleep at attack attend aunt autumn away
baby back bad bag ball bank bar base basic bath be beach bear beat beautiful because become bed bedroom been before begin behind believe bell belong below beside best better between beyond big bike bill bird birth birthday bit bite black blood blow blue board boat body boil book boot border born borrow both bottle bottom box boy brain branch brave bread break breakfast breath bridge bright bring broad broken brother brown brush build building burn bus business busy but butter buy by
cake call calm camera camp can cancel candle cap capital car card care careful carry case cash cat catch cause ceiling cell cent centre central century certain chair chance change cheap check cheese chicken child children chocolate choice choose church cinema circle citizen city class clean clear clever climb clock close clothes cloud club coast coat coffee coin cold collect college colour come comfortable common company compare complete computer concern condition connect consider contain continue control cook cool copy corner correct cost cotton could count country couple course cousin cover cow crash crazy cream create crime cross crowd cry cup cupboard curtain customer cut
daily damage dance danger dark date daughter day dead deal dear death decide decision deep degree delay deliver dentist depend describe desert design desk destroy detail develop diagram dictionary die diet difference different difficult dinner direct direction dirty disadvantage disagree discover discuss disease dish distance divide do doctor dog dollar door double doubt down draw dream dress drink drive drop dry duck during dust duty
each ear early earn earth east easy eat edge education effect effort egg eight either elbow elect electric else empty end enemy energy engine engineer english enjoy enough enter entire envelope equal escape especially europe even evening event ever every everyone everything exact exam example excellent except excited excuse exercise exist expect expensive experience explain express extra eye
face fact factory fail fair fall false familiar family famous fan far farm fashion fast fat father fault favourite fear feed feel feeling female fence few field fight fill film final find fine finger finish fire first fish fit five fix flag flat flight floor flour flower fly focus follow food foot football for force foreign forest forget fork form forward four free freedom fresh friend friendly from front fruit full fun funny furniture future
game garage garden gas gate general gentle get gift girl give glad glass go goal god gold good government grammar grass great green grey ground group grow guess guest guide gun guy
habit hair half hall hand handle hang happen happy hard hardly hat hate have he head health healthy hear heart heat heavy height hello help her here hero herself hide high hill him himself his history hit hobby hold hole holiday home honest hope horse hospital hot hotel hour house how however huge human hundred hungry hurry hurt husband
ice idea if ill imagine immediately important impossible improve in inch include increase indeed industry inform information inside instead interest interesting international internet into introduce invite iron island issue it item its itself
jacket jam job join joke journey joy judge juice jump just
keep key kick kid kill kind king kiss kitchen knee knife knock know knowledge
lack lady lake lamp land language large last late later laugh law lay lazy lead leader leaf learn least leave left leg lemon lend length less lesson let letter level library lie life lift light like likely limit line lion lip liquid list listen little live local lock lonely long look lose loss lost lot loud love low luck lucky lunch
machine mad magazine mail main major make male man manage manager many map march mark market marry match material matter may maybe me meal mean meaning measure meat medicine meet member memory mention menu message metal method middle might mile milk million mind mine minute mirror miss mistake mix model modern moment money month moon more morning most mother motor mountain mouth move movie much museum music must my myself
name narrow nation natural nature near nearly necessary neck need needle neighbour neither nervous net never new news newspaper next nice night nine no noise none nor normal north nose not note nothing notice nowadays now number nurse
object ocean of off offer office officer often oil old on once one onion only open operate opinion opposite or orange order ordinary organise other our out outside over own owner
pack page pain paint pair palace pale paper parent park part particular partner party pass passenger past path patient pattern pay peace pen pencil people pepper per perfect perform perhaps period permit person personal pet phone photo photograph piano pick picture piece pig pilot pink pipe place plan plane plant plastic plate play pleasant please pleasure plenty pocket point police policeman polite pollution pool poor popular population port position possible post potato pound pour power practice practise prefer prepare present president press pretty prevent price print prison private prize probably problem produce product program progress promise protect proud prove provide public pull punish pupil pure purple purpose push put
quality quarter queen question quick quiet quite
race radio railway rain raise rare rate rather reach read ready real realise reason receive recent recognise record red reduce refuse regular relation remain remember remind remove rent repair repeat reply report rest restaurant result return rice rich ride right ring rise risk river road rock role roll roof room root rope rose round row rubber rude rule run
sad safe safety sail salad salt same sand satisfy save say scene school science scissors score sea search season seat second secret secretary see seed seem sell send sense sentence separate serious serve service set settle several sex shake shall shape share sharp she sheep sheet shelf shine ship shirt shoe shoot shop short should shoulder shout show shower shut sick side sign signal silence silly silver similar simple since sing single sink sir sister sit situation six size skill skin skirt sky sleep slow small smell smile smoke snow so soap social sock soft software soil soldier solid some someone something sometimes son song soon sorry sort sound soup south space speak special speech speed spell spend spirit spoon sport spot spread spring square stage stairs stamp stand standard star start state station stay steal steam step stick still stomach stone stop store storm story straight strange street strength stress strike strong student study stupid subject success such sudden suffer sugar suggest suit summer sun supper supply support suppose sure surface surprise sweet swim system
table tail take talk tall taste tax taxi tea teach teacher team tear telephone television tell temperature ten tennis tent term terrible test than thank that the theatre their them themselves then there these they thick thin thing think third thirsty this those though thought thousand three throat through throw thumb thunder ticket tidy tie tight time tiny tired title to today toe together toilet tomato tomorrow tonight too tool tooth top total touch tour towards towel tower town toy track trade traffic train transport travel tree trip trouble trousers truck true trust truth try turn twice twin two type
ugly umbrella uncle under understand uniform union unit university unless until up upon upset upstairs use useful usually
vegetable very video view village visit voice
wait wake walk wall want war warm wash waste watch water wave way we weak wear weather wedding week weight welcome well west wet what wheel when where whether which while white who whole whose why wide wife wild will win wind window wine wing winter wire wise wish with within without woman women wonder wood wool word work worker world worry worse worth would wound write wrong
yard year yellow yes yesterday yet you young your yourself youth zero
`;

// High-precision corrections for the misspellings learners actually produce, checked before the
// edit-distance pass so the suggestion is always the intended word rather than the nearest one.
const MISSPELLINGS = {
  beleive: 'believe', belive: 'believe', recieve: 'receive', acheive: 'achieve', achive: 'achieve',
  goverment: 'government', govenment: 'government', enviroment: 'environment', enviornment: 'environment',
  necesary: 'necessary', neccessary: 'necessary', nesessary: 'necessary', avaliable: 'available', availible: 'available',
  seperate: 'separate', definately: 'definitely', definatly: 'definitely', occured: 'occurred', occuring: 'occurring',
  begining: 'beginning', writting: 'writing', writen: 'written', comming: 'coming', runing: 'running',
  stoped: 'stopped', planed: 'planned', prefered: 'preferred', refered: 'referred', transfered: 'transferred',
  succesful: 'successful', successfull: 'successful', sucess: 'success', succes: 'success',
  accomodation: 'accommodation', acommodation: 'accommodation', adress: 'address', aggresive: 'aggressive',
  arguement: 'argument', basicly: 'basically', begginer: 'beginner', beleif: 'belief', bussiness: 'business',
  buisness: 'business', calender: 'calendar', carefull: 'careful', catagory: 'category',
  collegue: 'colleague', comitted: 'committed', commited: 'committed', completly: 'completely',
  concious: 'conscious', curiousity: 'curiosity', decison: 'decision', desicion: 'decision',
  dissapoint: 'disappoint', dissapear: 'disappear', embarass: 'embarrass',
  enterance: 'entrance', equiptment: 'equipment', excercise: 'exercise', exersize: 'exercise',
  existance: 'existence', experiance: 'experience', explaination: 'explanation', familar: 'familiar',
  finaly: 'finally', foriegn: 'foreign', fourty: 'forty', freind: 'friend', fullfil: 'fulfil',
  grammer: 'grammar', gratefull: 'grateful', happend: 'happened', harrass: 'harass', hight: 'height',
  immediatly: 'immediately', independant: 'independent', intrest: 'interest', knowlege: 'knowledge',
  libary: 'library', lenght: 'length', maintainance: 'maintenance', mispell: 'misspell',
  noticable: 'noticeable', occassion: 'occasion', oppurtunity: 'opportunity', opportunuty: 'opportunity',
  paralell: 'parallel', particulary: 'particularly', peice: 'piece', percieve: 'perceive',
  perfomance: 'performance', persue: 'pursue', posession: 'possession',
  practicle: 'practical', priviledge: 'privilege', probaly: 'probably',
  proffesional: 'professional', pronounciation: 'pronunciation', publically: 'publicly',
  questionaire: 'questionnaire', reccomend: 'recommend', recomend: 'recommend', recomendation: 'recommendation',
  relevent: 'relevant', religous: 'religious', repitition: 'repetition', responsability: 'responsibility',
  restaraunt: 'restaurant', rythm: 'rhythm', safty: 'safety', scedule: 'schedule', secratary: 'secretary',
  sence: 'sense', similiar: 'similar', sincerly: 'sincerely', speach: 'speech', strenght: 'strength',
  supprise: 'surprise', suprise: 'surprise', temperture: 'temperature', tendancy: 'tendency',
  therefor: 'therefore', tommorow: 'tomorrow', tommorrow: 'tomorrow', truely: 'truly',
  unfortunatly: 'unfortunately', untill: 'until', usualy: 'usually', vegitable: 'vegetable',
  wich: 'which', wierd: 'weird', wellcome: 'welcome', withdrawl: 'withdrawal',
  reasearch: 'research', researchs: 'research', analize: 'analyse', critisism: 'criticism',
  developement: 'development', enviromental: 'environmental', pollutin: 'pollution', polution: 'pollution',
  poluted: 'polluted', transportion: 'transportation', comunication: 'communication',
  oppinion: 'opinion', opinon: 'opinion', benifit: 'benefit', benifits: 'benefits',
  advantag: 'advantage', dissadvantage: 'disadvantage', nowdays: 'nowadays', nowaday: 'nowadays',
  allways: 'always', becuase: 'because', becouse: 'because', bacause: 'because',
};

// Uncountable nouns learners routinely pluralise. Checked separately so the message can explain why.
const UNCOUNTABLE = ['information', 'advice', 'research', 'knowledge', 'equipment', 'furniture', 'money', 'traffic', 'news', 'progress', 'homework', 'software', 'evidence', 'luggage', 'accommodation', 'transport', 'pollution', 'behaviour'];

// Function words and irregular forms. These never derive from the regular inflection rules, and
// missing one produces a false alarm on the most frequent words in the language.
const FUNCTION_WORDS = `
am is are was were be been being have has had having do does did done doing
can could shall should will would may might must ought need dare
i me my mine myself you your yours he him his she her hers we us our ours they them their theirs
who whom whose which what where when why how whoever whatever whenever wherever however
not no nor none never nothing nobody nowhere neither either both all any some each every few many much more most less least
this that these those there here then than as if unless until while whereas although though because since so therefore thus hence however moreover furthermore nevertheless nonetheless otherwise instead besides
in on at by for with without from to into onto out off over under above below between among through during before after around along across behind beyond within toward towards upon against about
a an the and or but yet still even just only also too very quite rather almost already always often sometimes usually rarely seldom never ever
went gone going goes came come coming took taken takes made makes said says saw seen sees got gotten gets gave given gives knew known knows thought thinks found finds told tells became becomes left leaves felt feels kept keeps heard hears held holds brought brings wrote written writes spoke spoken speaks read reads ran runs won wins taught teaches bought buys sent sends built builds fell fallen cut reaches lost loses paid pays met meets sat stood understood understands grew grown began begun begins drew drawn chose chosen broke broken ate eaten drank drunk swam sang rang sank slept crept dealt meant sold sought caught fought bent lent spent leant learnt burnt dreamt
better best worse worst further furthest elder eldest
children men women feet teeth mice geese people persons
mr mrs ms dr st etc vs
`;
