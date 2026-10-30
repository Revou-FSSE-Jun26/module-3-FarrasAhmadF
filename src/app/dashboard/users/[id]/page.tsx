import UserEditor from "@/components/UserEditor";

export const metadata = { title: 'Edit User - RevoCoffee Admin' };

export default async function EditUserPage({params}: {params: Promise<{id: string}>}) {
    const {id} = await params;
    return <UserEditor userId={id} />;
}
