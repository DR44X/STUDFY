import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Flame,
  ListChecks,
  Menu,
  MoveVertical,
  Sparkles,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../lib/auth';
import { useSiteConfig } from '../lib/siteConfig';
import '../styles/landing.css';

const NAV = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#recursos', label: 'Recursos' },
];

export function Landing() {
  const { user } = useAuth();
  const { settings } = useSiteConfig();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <div className="landing">
      <header className={`lp-header${scrolled ? ' is-scrolled' : ''}`}>
        <div className="lp-container lp-header-inner">
          <Logo />
          <nav className="lp-nav" aria-label="Principal">
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="lp-header-actions">
            {user ? (
              <Link to="/painel" className="btn btn-primary btn-sm">
                Ir para o painel
              </Link>
            ) : (
              <>
                <Link to="/entrar" className="btn btn-ghost btn-sm">
                  Entrar
                </Link>
                <Link to="/cadastro" className="btn btn-primary btn-sm">
                  Criar conta
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="icon-btn lp-menu-toggle"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="lp-mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="lp-mobile-menu" id="lp-mobile-menu">
            <nav aria-label="Principal (celular)">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} onClick={close}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="lp-mobile-actions">
              {user ? (
                <Link to="/painel" className="btn btn-primary btn-block btn-lg">
                  Ir para o painel
                </Link>
              ) : (
                <>
                  <Link to="/cadastro" className="btn btn-primary btn-block btn-lg">
                    Criar conta
                  </Link>
                  <Link to="/entrar" className="btn btn-secondary btn-block btn-lg">
                    Entrar
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        {settings.announcement_enabled && settings.announcement_text && (
          <div className="lp-container" style={{ paddingTop: 16 }}>
            <div className="alert alert-info" role="status">
              <Sparkles size={16} />
              <span>{settings.announcement_text}</span>
            </div>
          </div>
        )}
        <section className="lp-hero">
          <div className="lp-container lp-hero-inner">
            <div className="lp-hero-copy">
              <span className="lp-eyebrow">
                <Sparkles size={14} /> {settings.hero_eyebrow}
              </span>
              <h1>{settings.hero_title}</h1>
              <p className="lp-lead">{settings.hero_subtitle}</p>
              <div className="lp-hero-cta">
                <Link to={user ? '/painel' : settings.allow_public_signup ? '/cadastro' : '/entrar'} className="btn btn-primary btn-lg">
                  {user ? 'Ir para o painel' : settings.allow_public_signup ? settings.hero_cta_text : 'Entrar na conta'} <ArrowRight size={18} />
                </Link>
                {!user && settings.allow_public_signup && (
                  <Link to="/entrar" className="btn btn-secondary btn-lg">
                    Já tenho conta
                  </Link>
                )}
              </div>
              <ul className="lp-hero-points">
                <li>
                  <Check size={16} /> 5 perguntas para começar
                </li>
                <li>
                  <Check size={16} /> Cronograma pronto na hora
                </li>
              </ul>
            </div>
            <AppPreview />
          </div>
        </section>

        {settings.show_how_it_works && (
          <section className="lp-section" id="como-funciona">
          <div className="lp-container">
            <header className="lp-section-head">
              <span className="lp-kicker">Como funciona</span>
              <h2>Do primeiro acesso ao primeiro estudo em poucos minutos.</h2>
            </header>
            <ol className="lp-steps">
              <li>
                <span className="lp-step-icon">
                  <UserRound size={20} />
                </span>
                <span className="lp-step-num">01</span>
                <h3>Conte sobre você</h3>
                <p>Objetivo, tempo disponível, dificuldades e nível. São só cinco perguntas rápidas.</p>
              </li>
              <li>
                <span className="lp-step-icon">
                  <CalendarCheck2 size={20} />
                </span>
                <span className="lp-step-num">02</span>
                <h3>Receba seu cronograma</h3>
                <p>As matérias são distribuídas na semana, com mais espaço para o que você mais precisa.</p>
              </li>
              <li>
                <span className="lp-step-icon">
                  <TrendingUp size={20} />
                </span>
                <span className="lp-step-num">03</span>
                <h3>Estude e acompanhe</h3>
                <p>Marque o que concluiu, reorganize quando a rotina mudar e veja seu progresso crescer.</p>
              </li>
            </ol>
          </div>
        </section>
        )}

        {settings.show_features && (
          <section className="lp-section lp-section-alt" id="recursos">
          <div className="lp-container">
            <header className="lp-section-head">
              <span className="lp-kicker">Recursos</span>
              <h2>Tudo o que você precisa para manter a constância. Nada além disso.</h2>
            </header>
            <div className="lp-features">
              <article>
                <ListChecks size={22} />
                <h3>Cronograma personalizado</h3>
                <p>Montado com base na sua disponibilidade e nas matérias em que você tem mais dificuldade.</p>
              </article>
              <article>
                <MoveVertical size={22} />
                <h3>Reorganize quando quiser</h3>
                <p>Imprevistos acontecem. Mova atividades entre os dias ou mude a ordem em segundos.</p>
              </article>
              <article>
                <TrendingUp size={22} />
                <h3>Progresso semanal</h3>
                <p>Acompanhe quanto do planejamento já foi cumprido, por dia e por matéria.</p>
              </article>
              <article>
                <Flame size={22} />
                <h3>Sequência de estudos</h3>
                <p>Veja quantos dias seguidos você estudou. Dias de descanso planejados não quebram a sequência.</p>
              </article>
            </div>
          </div>
        </section>
        )}

        {settings.show_cta && (
          <section className="lp-cta">
          <div className="lp-container">
            <div className="lp-cta-box">
              <h2>Comece hoje. No seu ritmo.</h2>
              <p>Crie sua conta e tenha seu cronograma de estudos para o ENEM em poucos minutos.</p>
              <Link to={user ? '/painel' : settings.allow_public_signup ? '/cadastro' : '/entrar'} className="btn btn-lg lp-cta-btn">
                {user ? 'Ir para o painel' : settings.allow_public_signup ? settings.hero_cta_text : 'Entrar'} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
        )}
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <Logo size="sm" />
            <p>{settings.institutional_tagline}</p>
          </div>
          <nav className="lp-footer-links" aria-label="Rodapé">
            <div>
              <h4>Produto</h4>
              <a href="#como-funciona">Como funciona</a>
              <a href="#recursos">Recursos</a>
            </div>
            <div>
              <h4>Conta</h4>
              <Link to="/entrar">Entrar</Link>
              <Link to="/cadastro">Criar conta</Link>
            </div>
          </nav>
        </div>
        <div className="lp-container lp-footer-bottom">
          <span>© {new Date().getFullYear()} {settings.site_name}. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}

/** Representação ilustrativa da plataforma (não interativa). */
function AppPreview() {
  const tasks = [
    { area: 'matematica', subject: 'Matemática', topic: 'Porcentagem e matemática financeira', meta: 'Teoria · 40 min', done: true },
    { area: 'redacao', subject: 'Redação', topic: 'Competência 5: proposta de intervenção', meta: 'Produção de texto · 40 min', done: false },
    { area: 'natureza', subject: 'Biologia', topic: 'Ecologia: cadeias e teias alimentares', meta: 'Exercícios · 40 min', done: false },
  ];
  const week = [100, 100, 66, 0, 0, 0, 0];
  return (
    <figure className="lp-preview" aria-label="Prévia ilustrativa do painel do Studfy">
      <div className="pv-window" aria-hidden="true">
        <div className="pv-bar">
          <span />
          <span />
          <span />
        </div>
        <div className="pv-body">
          <aside className="pv-side">
            <div className="pv-logo" />
            <div className="pv-nav is-active" />
            <div className="pv-nav" />
          </aside>
          <div className="pv-main">
            <div className="pv-head">
              <div>
                <small>Quarta-feira, 18 de novembro</small>
                <strong>Bom dia, Marina</strong>
              </div>
              <span className="pv-streak">
                <Flame size={14} /> 12 dias
              </span>
            </div>
            <div className="pv-grid">
              <div className="pv-card pv-today">
                <div className="pv-card-title">
                  <span>Hoje</span>
                  <small>1 de 3</small>
                </div>
                {tasks.map((t) => (
                  <div key={t.topic} className={`pv-task${t.done ? ' is-done' : ''}`} data-area={t.area}>
                    <span className="pv-check">{t.done && <Check size={11} strokeWidth={3} />}</span>
                    <div>
                      <span className="pv-subject">
                        <i style={{ background: 'var(--area)' }} />
                        {t.subject}
                      </span>
                      <p>{t.topic}</p>
                      <small>{t.meta}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pv-card pv-week">
                <div className="pv-card-title">
                  <span>Semana</span>
                  <small>38%</small>
                </div>
                <div className="pv-bars">
                  {week.map((v, i) => (
                    <div key={i} className="pv-bar-col">
                      <div className="pv-bar-track">
                        <div style={{ height: `${Math.max(v, 6)}%`, opacity: v ? 1 : 0.25 }} />
                      </div>
                      <small>{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">Exemplo de painel com atividades do dia, progresso da semana e sequência de estudos.</figcaption>
    </figure>
  );
}
