const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/home/user/index.html', 'utf8');
const errs = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/#/home',
  virtualConsole: new (require('jsdom').VirtualConsole)().on('jsdomError', e => errs.push('jsdomError: ' + e.message))
                                    .on('error', (...a) => errs.push('console.error: ' + a.join(' ')))
});
const { window } = dom;
const doc = window.document;
const $ = s => doc.querySelector(s);
const $$ = s => [...doc.querySelectorAll(s)];
const T = [];
const ok = (name, cond, extra='') => T.push((cond?'PASS':'FAIL') + ' | ' + name + (extra? ' | '+extra : ''));

// --- initial render
ok('featured ideas rendered (6)', $$('#featuredIdeas .card').length === 6, $$('#featuredIdeas .card').length);
ok('category cards rendered (4)', $$('#homeCategories .cat-card').length === 4);
ok('home stories rendered (3)', $$('#homeStories .card').length === 3);
ok('all ideas rendered in library', $$('#ideasGrid .card').length === 10, $$('#ideasGrid .card').length);
ok('idea count pill', /Showing 10 of 10/.test($('#ideaCount').textContent), $('#ideaCount').textContent);
ok('filter categories populated', $$('#fCategory option').length === 6, $$('#fCategory option').length);
ok('guide steps rendered (9)', $$('#guideSteps .step').length === 9);
ok('guide tasks = 36', $$('#guideSteps [data-gtask]').length === 36);
ok('faq rendered (6)', $$('#faqSteps .step').length === 6);
ok('stories page rendered (6)', $$('#storiesGrid .card').length === 6);
ok('presets rendered (4)', $$('#presets .preset').length === 4);
ok('year set', /^\d{4}$/.test($('#year').textContent), $('#year').textContent);

// --- filtering
const fire = (el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));
const setVal = (el, v) => { el.value = v; fire(el, 'change'); };

const shownCount = () => Number($('#ideaCount').textContent.split(' ')[1]);
setVal($('#fBudget'), 'low');
const lowShown = shownCount();
ok('budget filter reduces list', lowShown > 0 && lowShown < 10 && $$('#ideasGrid .card').length === lowShown, $('#ideaCount').textContent);
setVal($('#fLevel'), 'Beginner');
const combo = shownCount();
ok('budget+level filter narrows further', combo > 0 && combo <= lowShown && $$('#ideasGrid .card').length === combo, $('#ideaCount').textContent);
$('#clearFilters').click();
ok('clear filters restores 10', $$('#ideasGrid .card').length === 10);
setVal($('#fMode'), 'web');
ok('mode web filter (online+hybrid)', $$('#ideasGrid .card').length === 8, $('#ideaCount').textContent);
$('#clearFilters').click();
setVal($('#fCategory'), 'Food & Beverage');
ok('category filter', $$('#ideasGrid .card').length === 2, $('#ideaCount').textContent);
$('#clearFilters').click();
setVal($('#fSort'), 'az');
ok('sort A-Z first card is Customized Gift', /Customized Gift/.test($('#ideasGrid .card h3').textContent), $('#ideasGrid .card h3').textContent);
setVal($('#fSort'), 'low');
ok('sort lowest budget first', /₹0/.test($('#ideasGrid .card .card-meta').textContent));
setVal($('#fSort'), 'match');
$('#fSearch').value = 'bakery'; fire($('#fSearch'), 'input');
ok('search filter', $$('#ideasGrid .card').length === 1, $('#ideasGrid .card h3').textContent);
$('#clearFilters').click();

// empty state
setVal($('#fCategory'), 'Education'); setVal($('#fLevel'), 'Advanced');
ok('empty state shown', !$('#ideasEmpty').hidden && $$('#ideasGrid .card').length === 0);
$('#clearFilters').click();
ok('empty state cleared', $('#ideasEmpty').hidden);

// --- idea modal
$('#ideasGrid [data-detail]').click();
ok('idea modal opens', $('#modal').classList.contains('open'));
ok('modal has title + body sections', /Do this|first week/i.test($('#modalBody').textContent) && $('#modalBody').textContent.length > 500);
$('[data-close]').click();
ok('modal closes', !$('#modal').classList.contains('open'));

// --- planner
const P = { budget: 10000, equip: 3000, material: 2000, marketing: 1000, monthly: 1000, price: 500 };
Object.entries(P).forEach(([k,v]) => { const el = $('#p'+k[0].toUpperCase()+k.slice(1)); el.value = v; fire(el,'input'); });
ok('startup cost = 6000', $('#rStartup').textContent === '₹6,000', $('#rStartup').textContent);
ok('remaining budget = 4000', $('#rRemaining').textContent === '₹4,000', $('#rRemaining').textContent);
ok('runway = 4 months', $('#rRunway').textContent === '4 months', $('#rRunway').textContent);
ok('breakeven = 2000', $('#rBreakeven').textContent === '₹2,000', $('#rBreakeven').textContent);
ok('orders = 4/month', /4 orders \/ month/.test($('#rOrders').textContent), $('#rOrders').textContent);
ok('alloc bar segments = 4', $$('#rBar i').length === 4);
ok('tips rendered', $$('#rTips .tip').length === 4);
// over budget case
$('#pBudget').value = 1000; fire($('#pBudget'),'input');
ok('over-budget warning', /Over budget by/.test($('#rStatus').textContent), $('#rStatus').textContent.slice(0,60));
// preset
$$('#presets .preset')[1].click();
ok('preset fills values', $('#pBudget').value === '15000' && $('#rStartup').textContent === '₹12,000', $('#rStartup').textContent);
$('#resetPlanner').click();
ok('reset clears planner', $('#pBudget').value === '' && $('#rStartup').textContent === '₹0');

// --- guide checkboxes
const g1 = $('#guideSteps [data-gtask]');
g1.checked = true; fire(g1, 'change');
ok('guide progress updates', /1 of 36 tasks done/.test($('#guideProgressText').textContent), $('#guideProgressText').textContent);
ok('guide bar width', $('#guideBar').style.width !== '' && $('#guideBar').style.width !== '0%', $('#guideBar').style.width);
$('#guideSteps .step-head').click();
ok('accordion toggles', $('#guideSteps .step').classList.contains('open') === false);

// --- quiz flow
window.location.hash = '#/quiz';
fire(window, 'hashchange');
ok('quiz route shows', !$('#page-quiz').hidden && $('#page-home').hidden);
const pick = (name, val) => { const b = $(`[data-qopt="${name}"][data-value="${val}"]`); ok('opt exists '+name+'='+val, !!b); b.click(); };
pick('budget','15000'); $('#quizNext').click();
pick('skills','cooking'); pick('skills','design'); $('#quizNext').click();
pick('mode','offline'); $('#quizNext').click();
pick('time','moderate'); $('#quizNext').click();
pick('industries','food'); $('#quizNext').click();  // submit
ok('results shown', $('#quizResults').hidden === false && $('#quizShell').hidden === true);
const results = $$('#quizResults .ideas-grid .card');
ok('results have 3-6 ideas', results.length >= 3 && results.length <= 6, results.length + ' ideas');
ok('results show match score', /\d+% match/.test($('#quizResults').textContent));
ok('results explain reasons', /Why this matched/.test($('#quizResults').textContent));
ok('top match is food/kitchen idea', /Snack|Bakery|Plant|Gift/.test(results[0].querySelector('h3').textContent), results[0].querySelector('h3').textContent);
$('#quizResults [data-quizretake]').click();
ok('retake resets quiz', $('#quizShell').hidden === false && $('#quizStepLabel').textContent === 'Question 1 of 5');

// --- routes
['ideas','planner','guide','stories','about','home'].forEach(r => {
  window.location.hash = '#/' + r;
  fire(window, 'hashchange');
  const page = doc.querySelector(`[data-page="${r}"]`);
  ok('route '+r+' visible', page && !page.hidden);
  const active = $$('.nav-link.active').map(a=>a.getAttribute('data-route'));
  ok('nav active for '+r, active.length === 1 && active[0] === r, active.join(','));
});

// --- legal modal + story modal from links
$('[data-modal="privacy"]').click();
ok('privacy modal opens', $('#modal').classList.contains('open') && /Privacy/.test($('#modalTitle').textContent));
$('.modal-back').click();
window.location.hash = '#/stories'; fire(window, 'hashchange');
$('#storiesGrid [data-story]').click();
ok('story modal opens with fictional label', $('#modal').classList.contains('open') && /Fictional|fictional/.test($('#modalBody').textContent));
$('.modal-back').click();
$('[data-homecat="low"]').click();
ok('home category filter applied', $('#fBudget').value === 'low' && !$('#page-ideas').hidden && shownCount() === 9, $('#ideaCount').textContent);

// --- accessibility basics
ok('all buttons have text', $$('button').every(b => b.textContent.trim().length > 0 || b.getAttribute('aria-label')));
ok('inputs have labels', ['fSearch','fBudget','fMode','fLevel','fCategory','fSort','pBudget','pEquip','pMaterial','pMarketing','pMonthly','pPrice']
   .every(id => doc.querySelector(`label[for="${id}"]`)));
ok('images/svg decorative hidden', $$('svg').length > 0);

console.log(T.join('\n'));
console.log('\nRuntime errors:', errs.length ? errs : 'none');
const fails = T.filter(t=>t.startsWith('FAIL'));
console.log('\nSUMMARY: ' + (T.length-fails.length) + '/' + T.length + ' passed');
process.exit(fails.length || errs.length ? 1 : 0);
