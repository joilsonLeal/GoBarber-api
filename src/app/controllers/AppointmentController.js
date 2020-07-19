import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Notification from '../schemas/Notification';

class AppointmentController {
    async index(req, res) {
        const { page = 1 } = req.query;
        const appointments = await Appointment.findAll({
            where: { user_id: req.userId, canceled_at: null },
            order: ['date'],
            attributes: ['id', 'date'],
            limit: 20,
            offset: (page - 1) * 20,
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: File,
                            as: 'avatar',
                            attributes: ['id', 'path', 'url'],
                        },
                    ],
                },
            ],
        });

        return res.json(appointments);
    }


    async store(req, res) {
        const schema = Yup.object().shape({
            provider_id: Yup.number().required(),
            date: Yup.date().required(),
        });

        if(!(await schema.isValid(req.body)))
            return res.status(400).json({ error: 'Validation fails' });

        const { provider_id, date } = req.body;

        // check if provider_id is a provider

        const isProvider = await User.findOne({
            where: { id: provider_id, provider: true }
        });

        if(!isProvider)
            return res
            .status(401)
            .json({ error: `You can only create appointments with providers` });

        const hourStart = startOfHour(parseISO(date));

        // check if provider isn't user

        if(provider_id === req.userId)
            return res
            .status(400)
            .json({ error: `You can't make a appointment to yourself` });

        // check for past dates

        if(isBefore(hourStart, new Date()))
            return res
                .status(400)
                .json({ error: 'Past dates are not permited' });


        // check date availability

        const checkAvailability = await Appointment.findOne({
            where: { provider_id, date: hourStart, canceled_at: null },
        });

        if(checkAvailability)
            return res
                .status(400)
                .json({ error: `Appointment date isn't available` });

        const appointment = await Appointment.create({
            date: hourStart,
            provider_id,
            user_id: req.userId,
        });

        // Notify appointment provider

        const user = await User.findByPk(req.userId);
        const formatedDate = format(
            hourStart,
            "'dia' dd 'de' MMMM', às' H:mm'h'",
            { locale: pt }
        );

        await Notification.create({
            content: `Novo agendamento de ${
                user.name} para o ${formatedDate}`,
            user: provider_id,
        });

        return res.json(appointment);
    }
}

export default new AppointmentController();
