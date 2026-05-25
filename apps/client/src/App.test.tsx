// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders the build panel and world viewport', () => {
    render(<App />);

    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByTestId('game-viewport')).toBeInTheDocument();
    expect(screen.getByTestId('ui-overlay')).toContainElement(screen.getByText('Industrial.io'));
  });
});