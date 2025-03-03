function ContactContent({
  contact,
}: {
  contact: { id: number; name: string; phone: string; avatar: string };
}) {
  return (
    <div className="p-4">
      <h3 className="font-semibold">{contact.name}</h3>
      <p>Số điện thoại: {contact.phone}</p>
      <p>Thông tin chi tiết khác...</p>
    </div>
  );
}
export default ContactContent;
