export default function Organizations() {
  const organizations = [
    {
      id: 1,
      name: "Community Food Bank",
      description: "Providing food assistance to families in need since 1985",
      volunteers: 245,
      opportunities: 12,
      category: "Food & Hunger",
    },
    {
      id: 2,
      name: "Big Brothers Big Sisters",
      description: "Creating life-changing mentorship relationships",
      volunteers: 189,
      opportunities: 8,
      category: "Education & Youth",
    },
    {
      id: 3,
      name: "City Animal Shelter",
      description: "Finding loving homes for animals in need",
      volunteers: 156,
      opportunities: 15,
      category: "Animals",
    },
    {
      id: 4,
      name: "Green Earth Initiative",
      description: "Protecting and preserving our local environment",
      volunteers: 312,
      opportunities: 10,
      category: "Environment",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-primary-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Organizations</h1>
          <p className="text-xl">Discover nonprofits making a difference</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-3">Are you an organization?</h2>
          <p className="text-gray-700 mb-4">
            Join our platform to connect with passionate volunteers and manage your opportunities efficiently.
          </p>
          <button className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition">
            Register Your Organization
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-2xl font-semibold text-gray-800">{org.name}</h2>
                <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm">
                  {org.category}
                </span>
              </div>
              <p className="text-gray-700 mb-4">{org.description}</p>
              <div className="flex gap-6 text-sm text-gray-600 mb-4">
                <div>
                  <span className="font-semibold text-gray-800">{org.volunteers}</span> Volunteers
                </div>
                <div>
                  <span className="font-semibold text-gray-800">{org.opportunities}</span> Opportunities
                </div>
              </div>
              <button className="border border-primary-600 text-primary-600 px-6 py-2 rounded-lg hover:bg-primary-50 transition w-full">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
