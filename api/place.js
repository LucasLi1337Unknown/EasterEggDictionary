module.exports = function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  const forwarded = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  const ip = String(forwarded).split(',')[0].trim();
  res.status(200).json({ip:ip || 'Unavailable'});
};
