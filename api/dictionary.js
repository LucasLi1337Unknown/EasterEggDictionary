module.exports = async function handler(req, res) {
  const word = String(req.query.word || '').trim();
  if (!word || word.length > 100 || !/^[a-zA-Z '\-]+$/.test(word)) return res.status(400).json({error:'Enter an English word or phrase.'});
  try {
    const response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word), {signal:AbortSignal.timeout(8000)});
    if (response.ok) {
      const entries = await response.json();
      res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).json({entries, provider:'Free Dictionary API'});
    }
  } catch {}
  try {
    const response = await fetch('https://api.datamuse.com/words?sp=' + encodeURIComponent(word) + '&md=d&max=1', {signal:AbortSignal.timeout(7000)});
    if (!response.ok) throw Error();
    const words = await response.json();
    const match = words.find(item => item.word.toLowerCase() === word.toLowerCase() && item.defs?.length);
    if (match) {
      const parts = {n:'noun',v:'verb',adj:'adjective',adv:'adverb',u:'other'};
      const meanings = [];
      for (const def of match.defs) {
        const [tag,...rest] = def.split('\t');
        const partOfSpeech = parts[tag] || tag;
        let meaning = meanings.find(m => m.partOfSpeech === partOfSpeech);
        if (!meaning) {meaning={partOfSpeech,definitions:[]};meanings.push(meaning);}
        meaning.definitions.push({definition:rest.join('\t') || tag});
      }
      res.setHeader('Cache-Control','public, s-maxage=86400');
      return res.status(200).json({entries:[{word:match.word,meanings,sourceUrls:['https://www.datamuse.com/api/']}],provider:'Datamuse / WordNet'});
    }
    return res.status(404).json({error:'No entry found. Try a different spelling or a single word.'});
  } catch { return res.status(503).json({error:'The dictionary service is taking a break. Please try again shortly.'}); }
};
