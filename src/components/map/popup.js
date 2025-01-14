const Popup = ({properties}) => (
  <div>
    <h3 className='text-base text-black font-bold'>{properties.nom || 'Pas de nom renseigné'}</h3>
  </div>
)

export default Popup
