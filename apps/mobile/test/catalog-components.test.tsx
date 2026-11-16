import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { CategoryChip, EmptyState, ErrorState, FeaturedSeriesCard, LoadingSkeleton, PremiumBadge, SectionHeader, SeriesCard } from '../src/components/catalog';
import { GluestackButton } from '../src/components/ui/button';
import CatalogHomeScreen from '../src/app/index';
import PublicSeriesDetailScreen from '../src/app/series/[slug]/index';
import PublicSeasonEpisodesScreen from '../src/app/series/[slug]/seasons/[seasonNumber]';

const mockUseCatalogSeriesDetail = jest.fn();
const mockUseCatalogSeasonEpisodes = jest.fn();

jest.mock('expo-router', () => {
  const actual = jest.requireActual('react') as typeof React;
  const native = jest.requireActual('react-native') as typeof import('react-native');
  return {
    Link: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
      asChild && actual.isValidElement(children)
        ? actual.cloneElement(children)
        : actual.createElement(native.Text, { accessibilityRole: 'link' }, children)
    ),
    useRouter: () => ({ back: jest.fn() }),
    useLocalSearchParams: () => ({ slug: 'synthetic-story', seasonNumber: '1' }),
  };
});

jest.mock('expo-linear-gradient', () => {
  const actual = jest.requireActual('react') as typeof React;
  const native = jest.requireActual('react-native') as typeof import('react-native');
  return {
    LinearGradient: ({ children, style }: { children?: React.ReactNode; style?: object }) =>
      actual.createElement(native.View, { style }, children),
  };
});

jest.mock('../src/hooks/use-catalog-details', () => ({
  useCatalogSeriesDetail: (...args: unknown[]) => mockUseCatalogSeriesDetail(...args),
  useCatalogSeasonEpisodes: (...args: unknown[]) => mockUseCatalogSeasonEpisodes(...args),
}));

jest.mock('../src/hooks/use-catalog-data', () => ({
  useCatalogData: () => ({
    state: {
      status: 'success',
      categories: [],
      series: {
        items: [],
        pagination: { page: 1, pageSize: 12, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
      },
    },
    retry: jest.fn(),
  }),
}));

const sampleSeries = {
  id: 'series-1',
  slug: 'synthetic-story',
  title: 'Título recebido da API',
  synopsis: 'Sinopse recebida da API, sem dados fictícios.',
  posterUrl: null,
  ageRating: null,
  categories: [{ id: 'category-1', slug: 'drama', name: 'Drama' }],
  publishedAt: '2026-11-16T12:00:00.000Z',
};

describe('catalog design system components', () => {
  test('renders public series cards from their API data and labels a missing poster honestly', async () => {
    const { rerender } = await render(<SeriesCard series={sampleSeries} />);
    expect(screen.getByText('Título recebido da API')).toBeTruthy();
    expect(screen.getByText('Sinopse recebida da API, sem dados fictícios.')).toBeTruthy();
    expect(screen.getByText('IMAGEM INDISPONÍVEL')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Abrir detalhes de Título recebido da API' })).toBeTruthy();

    await rerender(<FeaturedSeriesCard series={sampleSeries} />);
    expect(screen.getByText('Título recebido da API')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Abrir detalhes de Título recebido da API' })).toBeTruthy();
  });

  test('renders the catalog empty state without sample titles or metrics', async () => {
    await render(<EmptyState />);
    expect(screen.getByText('Ainda não há séries publicadas')).toBeTruthy();
    expect(screen.queryByText(/avaliação|visualizações|episódios/i)).toBeNull();
  });

  test('public Home renders the anonymous catalog without requiring an auth session', async () => {
    await render(<CatalogHomeScreen />);
    expect(screen.getByText('Ainda não há séries publicadas')).toBeTruthy();
    expect(screen.getByText('Acessar conta')).toBeTruthy();
    expect(screen.queryByText('Entre com o e-mail e a senha da sua conta.')).toBeNull();
  });

  test('renders loading feedback for assistive technology', async () => {
    await render(<LoadingSkeleton rows={1} />);
    expect(screen.getByLabelText('Carregando catálogo')).toBeTruthy();
  });

  test('renders category chips and section links as accessible navigation items', async () => {
    await render(<CategoryChip category={{ id: 'category-1', slug: 'drama', name: 'Drama' }} />);
    expect(screen.getByRole('link', { name: 'Drama' })).toBeTruthy();

    await render(<SectionHeader actionLabel="Ver todas" href="/series" title="Séries para descobrir" />);
    expect(screen.getByText('Séries para descobrir')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver todas' })).toBeTruthy();
  });

  test('renders the premium label as metadata only', async () => {
    await render(<PremiumBadge />);
    expect(screen.getByText('PREMIUM')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('renders the error state and invokes the gluestack retry button', async () => {
    const retry = jest.fn();
    await render(<ErrorState message="Confira sua conexão e tente novamente." onRetry={retry} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test('gluestack button shows an accessible loading state and blocks interaction', async () => {
    const action = jest.fn();
    await render(<GluestackButton loading onPress={action} title="Tentar novamente" />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    fireEvent.press(button);
    expect(action).not.toHaveBeenCalled();
  });
});

describe('public series detail and season screens', () => {
  const detail = {
    ...sampleSeries,
    ageRating: '13+',
    description: 'Descrição complementar recebida da API. '.repeat(12),
    featuredImageUrl: 'https://cdn.example.test/series/hero.jpg',
  };
  const seasons = [
    { id: 'season-1', seasonNumber: 1, title: 'Primeiros passos' },
    { id: 'season-2', seasonNumber: 2, title: null },
  ];

  test('renders real series details, categories, age rating, expandable description, and seasons', async () => {
    await mockUseCatalogSeriesDetail.mockReturnValue({
      state: { status: 'success', data: { series: detail, seasons } },
      retry: jest.fn(),
    });

    await render(<PublicSeriesDetailScreen />);
    expect(screen.getByText('Título recebido da API')).toBeTruthy();
    expect(screen.getByText('Sinopse recebida da API, sem dados fictícios.')).toBeTruthy();
    expect(screen.getByText('13+')).toBeTruthy();
    expect(screen.getByText('Drama')).toBeTruthy();
    expect(screen.getByText('Primeiros passos')).toBeTruthy();
    expect(screen.getByText('Temporada 2')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Ler descrição completa' }));
    expect(screen.getByRole('button', { name: 'Recolher descrição' })).toBeTruthy();
  });

  test('renders a visual placeholder and an honest empty state when optional images and seasons are absent', async () => {
    await mockUseCatalogSeriesDetail.mockReturnValue({
      state: {
        status: 'success',
        data: {
          series: { ...detail, description: null, featuredImageUrl: null, posterUrl: null, ageRating: null, categories: [] },
          seasons: [],
        },
      },
      retry: jest.fn(),
    });

    await render(<PublicSeriesDetailScreen />);
    expect(screen.getByText('IMAGEM INDISPONÍVEL')).toBeTruthy();
    expect(screen.getByText('Nenhuma temporada disponível')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Todas as séries' })).toBeTruthy();
  });

  test('shows a non-disclosing unavailable state for a missing or unpublished series', async () => {
    await mockUseCatalogSeriesDetail.mockReturnValue({ state: { status: 'not-found' }, retry: jest.fn() });

    await render(<PublicSeriesDetailScreen />);
    expect(screen.getByText('Série indisponível')).toBeTruthy();
    expect(screen.getByText('Esta série não está disponível no catálogo.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Voltar a todas as séries' })).toBeTruthy();
  });

  test('renders episodes in API order with FREE and PREMIUM metadata and duration', async () => {
    const episodes = [
      { id: 'episode-1', episodeNumber: 1, title: 'Primeiro episódio', description: 'Descrição real do episódio.', thumbnailUrl: null, durationSeconds: 542, accessLevel: 'FREE' as const, publishedAt: '2026-11-16T12:00:00.000Z' },
      { id: 'episode-2', episodeNumber: 2, title: 'Segundo episódio', description: null, thumbnailUrl: 'https://cdn.example.test/episodes/2.jpg', durationSeconds: 600, accessLevel: 'PREMIUM' as const, publishedAt: '2026-11-16T12:00:00.000Z' },
    ];
    await mockUseCatalogSeasonEpisodes.mockReturnValue({
      state: {
        status: 'success',
        data: {
          items: episodes,
          pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        },
      },
      retry: jest.fn(),
    });

    await render(<PublicSeasonEpisodesScreen />);
    expect(screen.getByText('Temporada 1')).toBeTruthy();
    expect(screen.getByText('Primeiro episódio')).toBeTruthy();
    expect(screen.getByText('Segundo episódio')).toBeTruthy();
    expect(screen.getByText('FREE')).toBeTruthy();
    expect(screen.getByText('PREMIUM')).toBeTruthy();
    expect(screen.getByText('9 min 2 s')).toBeTruthy();
    expect(screen.getByText('10 min')).toBeTruthy();
    expect(screen.getByText(/Reprodução e assinaturas ainda não estão disponíveis/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /reproduzir|play/i })).toBeNull();
  });

  test('renders an empty episode state for a published season without listed episodes', async () => {
    await mockUseCatalogSeasonEpisodes.mockReturnValue({
      state: {
        status: 'success',
        data: {
          items: [],
          pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        },
      },
      retry: jest.fn(),
    });

    await render(<PublicSeasonEpisodesScreen />);
    expect(screen.getByText('Nenhum episódio publicado')).toBeTruthy();
  });

  test('shows a safe retry after a network failure and an unavailable state for a missing season', async () => {
    const retry = jest.fn();
    await mockUseCatalogSeasonEpisodes.mockReturnValue({
      state: { status: 'error', message: 'Confira sua rede e tente novamente.' },
      retry,
    });
    const { rerender } = await render(<PublicSeasonEpisodesScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledTimes(1);

    await mockUseCatalogSeasonEpisodes.mockReturnValue({ state: { status: 'not-found' }, retry });
    await rerender(<PublicSeasonEpisodesScreen />);
    expect(screen.getByText('Temporada indisponível')).toBeTruthy();
  });
});
