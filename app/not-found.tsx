import Link from "next/link";
import { Container, EmptyState, buttonClass } from "@/components/ui";
import { getCategories } from "@/lib/catalogue";

export default async function NotFound() {
  const categories = await getCategories();
  return (
    <Container className="py-20">
      <EmptyState
        title="We couldn't find that page"
        description="It may have moved. Try our products, or ask us on WhatsApp."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/products" className={buttonClass({ variant: "primary" })}>
              Shop products
            </Link>
            {categories.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/categories/${c.slug}`} className={buttonClass({ variant: "outline" })}>
                {c.name}
              </Link>
            ))}
          </div>
        }
      />
    </Container>
  );
}
