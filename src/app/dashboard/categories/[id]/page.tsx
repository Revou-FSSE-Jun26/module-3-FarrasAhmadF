import CategoryEditor from "@/components/CategoryEditor";

export const metadata = { title: 'Edit Category - RevoCoffee Admin' };

export default async function EditCategoryPage({params}: {params: Promise<{id: string}>}) {
    const {id} = await params;
    return <CategoryEditor categoryId={id} />;
}
