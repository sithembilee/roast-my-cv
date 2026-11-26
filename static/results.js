const review = JSON.parse(sessionStorage.getItem('cvReview') || 'null');
if (!review) {
  window.location.replace('/');
} else {
  document.querySelector('#summary').textContent = review.summary;
  document.querySelector('#score').textContent = review.score;
  document.querySelector('#score-label').textContent = review.score_label;
  document.querySelector('#score-ring').style.background = `conic-gradient(#a7c642 0deg, #a7c642 ${Math.round(review.score * 3.6)}deg, #ecebe3 ${Math.round(review.score * 3.6)}deg 360deg)`;
  document.querySelector('#score-caption').textContent = `Your CV, reviewed for the role of ${review.dream_role}.`;
  const findings = document.querySelector('#findings');
  for (const finding of (review.findings || [])) {
    if (finding.title === 'Make every bullet earn its space' && !finding.suggestions) {
      finding.body = 'Start with the action you took, say what you changed, and show the result. Use the starter below as a pattern, then fill it with your actual work and numbers.';
      finding.suggestions = [
        'Start with a precise action verb: Built, launched, redesigned, automated, negotiated, or mentored.',
        'Name what you personally did, then add the outcome and a number if you can.',
        'Choose the verb that truthfully describes your contribution; avoid claiming ownership you didn’t have.',
      ];
      finding.example = 'Built [tool or process] for [team or customers], cutting [time or cost] by [X%] over [timeframe].';
    }
    if (finding.title === 'Show the outcome, not just the activity' && !finding.suggestions) {
      finding.suggestions = [
        'Add a number that proves the change: percentage, time saved, revenue, reach, or volume.',
        'Include the timeframe and scale, such as customers served or projects delivered.',
      ];
      finding.example = 'Reduced [process time] by [X%] across [team or customer group] in [timeframe].';
    }
    const card = document.createElement('article');
    card.className = `finding-card ${finding.kind === 'fix' ? 'fix' : ''}`;
    const icon = document.createElement('div');
    icon.className = 'finding-icon';
    icon.textContent = finding.kind === 'fix' ? '↗' : '✳';
    const title = document.createElement('h3');
    title.textContent = finding.title;
    const body = document.createElement('p');
    body.textContent = finding.body;
    card.append(icon, title, body);
    if (finding.suggestions?.length) {
      const suggestionTitle = document.createElement('h4');
      suggestionTitle.className = 'suggestion-title';
      suggestionTitle.textContent = 'WHAT TO ADD';
      const suggestionList = document.createElement('ul');
      suggestionList.className = 'suggestion-list';
      for (const suggestion of finding.suggestions) {
        const item = document.createElement('li');
        item.textContent = suggestion;
        suggestionList.append(item);
      }
      card.append(suggestionTitle, suggestionList);
    }
    if (finding.example) {
      const example = document.createElement('div');
      example.className = 'bullet-example';
      const exampleLabel = document.createElement('span');
      exampleLabel.textContent = 'BULLET STARTER';
      const exampleText = document.createElement('p');
      exampleText.textContent = finding.example;
      example.append(exampleLabel, exampleText);
      card.append(example);
    }
    findings.append(card);
  }
  const keywords = document.querySelector('#keywords');
  for (const word of review.keywords || []) {
    const chip = document.createElement('span');
    chip.className = 'keyword-chip';
    chip.textContent = word;
    keywords.append(chip);
  }
  if (review.strengths?.length) {
    document.querySelector('#keyword-copy').textContent = `${review.strengths.join(' ')} Match these strengths to the language in the job description.`;
  }
  document.querySelector('#source-note').textContent = review.source === 'ai' ? 'A role-aware AI review, based on the text in your CV.' : 'A text and structure based review. Add an OPENAI_API_KEY for deeper role-specific AI feedback.';
}
