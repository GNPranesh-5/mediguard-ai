import { SearchX } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <PageContainer>
      <EmptyState icon={SearchX} title="This page does not exist" message="Check the address, or go back to a page that does.">
        <Button to="/">Go home</Button>
        <Button to="/search" variant="secondary">Search medicines</Button>
      </EmptyState>
    </PageContainer>
  );
}
