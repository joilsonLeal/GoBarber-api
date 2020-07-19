import User from '../models/User';
import Notification from '../schemas/Notification';

class NotificafionController {
    async index(req, res) {
        const checkIsProvider = await User.findOne({
            where: { id: req.userId, provider: true }
        });

        if(!checkIsProvider)
            return res
            .status(401)
            .json({ error: `Only provider can load notifications` });

        const notifications = await Notification.find({
            user: req.userId,
            read: false,
        }).sort({ createdAd: 'desc' }).limit(20);

        return res.json(notifications);
    }

    async update(req, res) {
        const checkIsProvider = await User.findOne({
            where: { id: req.userId, provider: true }
        });

        if(!checkIsProvider)
            return res
            .status(401)
            .json({ error: `Only provider can load notifications` });

        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true },
        );

        return res.send(notification);
    }
}

export default new NotificafionController();
